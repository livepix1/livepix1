import type { PaymentProvider } from "./provider";
import { asaasProvider } from "./asaas";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";

export * from "./provider";

/**
 * Provider ativo. Brasil = Asaas. Quando a expansão LatAm chegar, este é o único
 * ponto que decide por país/moeda (Stripe entra aqui sem mexer no resto do app).
 */
export function getProvider(): PaymentProvider {
  return asaasProvider;
}

/**
 * Split (F5): se o criador já tem subconta Asaas APROVADA, a cobrança nasce
 * dividida — percentual líquido vai direto pra subconta dele, a taxa fica na
 * master. Sem subconta aprovada, retorna undefined e o fluxo antigo (tudo pra
 * master) continua intacto.
 */
export async function getCreatorSplit(
  creatorId: string,
  method: "PIX" | "CARD" = "PIX"
): Promise<{ splitWalletId?: string; splitNetPercent?: number }> {
  const account = await prisma.providerAccount.findUnique({ where: { userId: creatorId } });
  if (!account?.walletId || account.kycStatus !== "APPROVED") {
    return {};
  }
  const feePercent = method === "CARD" ? BRAND.fees.cardPercent : BRAND.fees.pixPercent;
  return { splitWalletId: account.walletId, splitNetPercent: 100 - feePercent };
}
