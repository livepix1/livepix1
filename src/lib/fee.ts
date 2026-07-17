/** Lógica pura de taxa de saque — sem imports de servidor, seguro no client. */

/** Taxa de saque (fixa por operação), em reais. Ajuste conforme a política real. */
export const WITHDRAWAL_FEE_FIXED = 1.75;

/** Calcula a taxa e o valor líquido de um saque. */
export function computeWithdrawalFee(amount: number): {
  fee: number;
  net: number;
} {
  const fee = amount > 0 ? WITHDRAWAL_FEE_FIXED : 0;
  const net = Math.max(0, Math.round((amount - fee) * 100) / 100);
  return { fee, net };
}
