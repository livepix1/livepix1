"use server";

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

export type ActionResult =
  | { ok: true; message?: string }
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

/** Solicita um saque. NÃO move dinheiro — apenas registra a intenção (status PENDING). */
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
      status: "PENDING",
    },
  });

  // Ledger: reserva o valor (débito) — idempotente por withdrawal.id.
  await postEntry({
    userId,
    type: "PAYOUT",
    amount: -amount,
    refType: "Withdrawal",
    refId: withdrawal.id,
    providerEventId: `withdrawal:${withdrawal.id}`,
    description: "Saque solicitado",
  });

  revalidatePath("/saques");
  revalidatePath("/dashboard");
  return { ok: true, message: "Saque solicitado" };
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
