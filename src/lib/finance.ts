import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";

export { WITHDRAWAL_FEE_FIXED, computeWithdrawalFee } from "@/lib/fee";

/**
 * Saldo disponível = soma das cobranças PAGAS
 *   menos os saques que não falharam (PENDING/PROCESSING/COMPLETED reservam o valor).
 */
export async function getBalance(userId: string): Promise<number> {
  const [paid, withdrawn] = await Promise.all([
    prisma.charge.aggregate({
      where: { userId, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { userId, status: { in: ["PENDING", "PROCESSING", "COMPLETED"] } },
      _sum: { amount: true },
    }),
  ]);

  const received = toNumber(paid._sum.amount);
  const out = toNumber(withdrawn._sum.amount);
  return Math.round((received - out) * 100) / 100;
}
