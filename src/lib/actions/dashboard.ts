"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  paymentLinkSchema,
  withdrawalSchema,
  profileSchema,
} from "@/lib/validators";
import { computeWithdrawalFee, getBalance } from "@/lib/finance";
import { postEntry } from "@/lib/ledger";
import { decrypt } from "@/lib/crypto";
import { verifyTotpToken } from "@/lib/totp";
import { sendEmail, isEmailConfigured } from "@/lib/email";

// Validade do link de confirmação de saque por e-mail.
const CONFIRM_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export type ActionResult =
  | { ok: true; message?: string; confirmUrl?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function collectFieldErrors(error: ZodError): Record<string, string> {
  const fe: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = issue.path[0];
    if (typeof k === "string" && !fe[k]) fe[k] = issue.message;
  }
  return fe;
}

/** Cria ou atualiza o link de pagamento do usuário logado. */
export async function saveLink(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = paymentLinkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { linkType, title, description, value, imageUrl } = parsed.data;
  // Valor só se aplica a VALOR_FIXO/CONSULTORIA; DOACAO é sempre variável (null).
  const finalValue =
    linkType === "DOACAO" || value === undefined || Number.isNaN(value)
      ? null
      : new Prisma.Decimal(value);

  const existing = await prisma.paymentLink.findFirst({ where: { userId } });

  const data = {
    title: title.trim(),
    description: description?.trim() || null,
    linkType,
    value: finalValue,
    imageUrl: imageUrl?.trim() || null,
  };

  if (existing) {
    await prisma.paymentLink.update({ where: { id: existing.id }, data });
  } else {
    await prisma.paymentLink.create({ data: { ...data, userId } });
  }

  revalidatePath("/meu-link");
  revalidatePath("/dashboard");
  return { ok: true, message: "Link salvo com sucesso" };
}

/**
 * Solicita um saque. NÃO move dinheiro — cria o registro em AWAITING_CONFIRMATION e
 * manda o link de confirmação por e-mail (F7). O ledger só é reservado depois que
 * confirmWithdrawal for chamado (link clicado) — nunca aqui na criação.
 */
export async function requestWithdrawal(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = withdrawalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.totpEnabled && user.totpSecretEnc) {
    const code = parsed.data.totpCode?.trim() || "";
    if (!code) {
      return {
        ok: false,
        error: "Código do autenticador obrigatório pra sacar",
        fieldErrors: { totpCode: "Obrigatório" },
      };
    }
    if (!verifyTotpToken(decrypt(user.totpSecretEnc), code)) {
      return {
        ok: false,
        error: "Código do autenticador inválido",
        fieldErrors: { totpCode: "Código inválido" },
      };
    }
  }

  const balance = await getBalance(userId);
  const { amount } = parsed.data;

  if (amount > balance) {
    return {
      ok: false,
      error: "Saldo insuficiente para esse saque",
      fieldErrors: { amount: "Valor acima do saldo disponível" },
    };
  }

  const { fee, net } = computeWithdrawalFee(amount);

  // Confirmação por e-mail (F7): cria o saque AGUARDANDO confirmação — o ledger só
  // é postado depois que o link mágico for clicado (ver confirmWithdrawal abaixo).
  const confirmToken = randomBytes(24).toString("hex");

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId,
      amount: new Prisma.Decimal(amount),
      fee: new Prisma.Decimal(fee),
      netAmount: new Prisma.Decimal(net),
      destinationType: parsed.data.destinationType,
      destinationPixKey: parsed.data.destinationPixKey?.trim() || null,
      destinationBank: parsed.data.destinationBank?.trim() || null,
      destinationAgency: parsed.data.destinationAgency?.trim() || null,
      destinationAccount: parsed.data.destinationAccount?.trim() || null,
      status: "AWAITING_CONFIRMATION",
      confirmToken,
    },
  });

  const confirmUrl = `${process.env.NEXTAUTH_URL ?? ""}/confirmar-saque/${confirmToken}`;

  const sent = user?.email
    ? await sendEmail({
        to: user.email,
        subject: "Confirme seu saque",
        html: `<p>Você solicitou um saque (nº ${withdrawal.id}) de ${net.toFixed(2)} (líquido). Clique no link abaixo para confirmar:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p><p>Se não foi você, ignore este e-mail — o saque não será processado sem confirmação.</p>`,
      })
    : false;

  revalidatePath("/saques");
  revalidatePath("/dashboard");

  if (sent) {
    return { ok: true, message: "Verifique seu e-mail para confirmar o saque" };
  }

  // Sem provider de e-mail configurado (ou envio falhou): nunca esconder o link do
  // usuário — é a única forma dele confirmar o saque nesse ambiente.
  return {
    ok: true,
    message: isEmailConfigured()
      ? "Saque solicitado, mas o e-mail de confirmação não pôde ser enviado"
      : "Saque solicitado (e-mail não configurado neste ambiente)",
    confirmUrl,
  };
}

/**
 * Confirma um saque pelo link mágico enviado por e-mail (sem exigir login —
 * o próprio token autentica a ação, mesmo padrão de cancelSubscriptionByToken).
 * Só AQUI o valor é reservado no ledger — nunca na criação do saque.
 */
export async function confirmWithdrawal(
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { confirmToken: token },
  });
  if (!withdrawal) {
    return { ok: false, error: "Link de confirmação inválido" };
  }

  if (withdrawal.status !== "AWAITING_CONFIRMATION") {
    // Idempotência: segunda tentativa com o mesmo token nunca reprocessa o ledger.
    return { ok: false, error: "Este saque já foi confirmado ou processado" };
  }

  const ageMs = Date.now() - withdrawal.createdAt.getTime();
  if (ageMs > CONFIRM_TOKEN_TTL_MS) {
    return { ok: false, error: "Link de confirmação expirado. Solicite o saque novamente." };
  }

  // Update condicional (status ainda AWAITING_CONFIRMATION) — guarda extra contra
  // corrida de duas requisições com o mesmo token processando ao mesmo tempo.
  const claim = await prisma.withdrawal.updateMany({
    where: { id: withdrawal.id, status: "AWAITING_CONFIRMATION" },
    data: { status: "PENDING", confirmedAt: new Date() },
  });
  if (claim.count === 0) {
    return { ok: false, error: "Este saque já foi confirmado ou processado" };
  }

  // Ledger: reserva o valor (débito) — idempotente por withdrawal.id.
  await postEntry({
    userId: withdrawal.userId,
    type: "PAYOUT",
    amount: -withdrawal.amount.toNumber(),
    refType: "Withdrawal",
    refId: withdrawal.id,
    providerEventId: `withdrawal:${withdrawal.id}`,
    description: "Saque confirmado por e-mail",
  });

  revalidatePath("/saques");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Atualiza o perfil do usuário logado. */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const username = parsed.data.username?.trim().toLowerCase() || null;

  if (username) {
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      return {
        ok: false,
        error: "Nome de usuário já está em uso",
        fieldErrors: { username: "Já está em uso" },
      };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name.trim(),
      username,
      cpf: parsed.data.cpf?.trim() || null,
      accountType: parsed.data.accountType,
      pixKey: parsed.data.pixKey?.trim() || null,
      avatar: parsed.data.avatar?.trim() || null,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return { ok: true, message: "Perfil atualizado" };
}
