"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { verificacaoSchema } from "@/lib/validators";
import { createSubAccount, AsaasNotConfiguredError, AsaasError } from "@/lib/asaas-client";
import { encrypt } from "@/lib/crypto";

export type VerificationResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Submete os dados de KYC e cria a subconta do criador no Asaas (F5 — dinheiro real).
 * INERTE enquanto ASAAS_API_KEY/CRYPTO_MASTER_KEY não estiverem configuradas: devolve
 * erro amigável, não derruba a página. Idempotente: se já existe subconta, não recria.
 */
export async function submitVerification(input: unknown): Promise<VerificationResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = verificacaoSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (typeof k === "string" && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors };
  }

  const existing = await prisma.providerAccount.findUnique({ where: { userId } });
  if (existing?.subAccountId && existing.kycStatus !== "REJECTED") {
    return { ok: false, error: "Você já tem uma verificação em andamento ou concluída." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Usuário não encontrado" };

  const d = parsed.data;

  try {
    const subAccount = await createSubAccount({
      name: user.name,
      email: user.email,
      cpfCnpj: d.cpfCnpj,
      companyType: d.companyType,
      birthDate: d.birthDate || undefined,
      mobilePhone: d.mobilePhone || undefined,
      address: d.address.trim(),
      addressNumber: d.addressNumber.trim(),
      province: d.province.trim(),
      postalCode: d.postalCode,
      incomeValue: d.incomeValue,
    });

    const apiKeyEnc = encrypt(subAccount.apiKey);

    await prisma.providerAccount.upsert({
      where: { userId },
      update: {
        subAccountId: subAccount.id,
        walletId: subAccount.walletId,
        apiKeyEnc,
        kycStatus: "PENDING",
      },
      create: {
        userId,
        provider: "ASAAS",
        subAccountId: subAccount.id,
        walletId: subAccount.walletId,
        apiKeyEnc,
        kycStatus: "PENDING",
      },
    });

    revalidatePath("/verificacao");
    return {
      ok: true,
      message:
        "Subconta criada. O Asaas vai analisar seus documentos — acompanhe o status aqui.",
    };
  } catch (err) {
    if (err instanceof AsaasNotConfiguredError) {
      return {
        ok: false,
        error:
          "Pagamentos reais ainda não estão habilitados nesta conta (aguardando aprovação do Asaas). Seus dados não foram enviados.",
      };
    }
    if (err instanceof AsaasError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Error && err.name === "CryptoNotConfiguredError") {
      return { ok: false, error: "Erro de configuração interna. Avise o suporte." };
    }
    return { ok: false, error: "Erro ao criar a subconta. Tente novamente." };
  }
}
