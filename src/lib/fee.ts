/** Lógica pura de taxas — sem imports de servidor, seguro no client. */

import { BRAND } from "@/lib/brand";

/**
 * Taxa de saque. DIFERENCIAL: saque sempre grátis (vs R$0,50 do concorrente).
 */
export const WITHDRAWAL_FEE_FIXED = BRAND.fees.withdrawalFee;

/** Taxa da plataforma sobre uma doação/pagamento recebido, por método. */
export function computePlatformFee(
  amount: number,
  method: "PIX" | "CARD" = "PIX"
): { fee: number; net: number } {
  const percent = method === "PIX" ? BRAND.fees.pixPercent : BRAND.fees.cardPercent;
  const fee = Math.round(amount * percent) / 100; // percent% com 2 casas
  const net = Math.round((amount - fee) * 100) / 100;
  return { fee, net };
}

/** Calcula a taxa e o valor líquido de um saque. */
export function computeWithdrawalFee(amount: number): {
  fee: number;
  net: number;
} {
  const fee = amount > 0 ? WITHDRAWAL_FEE_FIXED : 0;
  const net = Math.max(0, Math.round((amount - fee) * 100) / 100);
  return { fee, net };
}
