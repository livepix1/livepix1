/**
 * Fachada financeira — delega ao ledger append-only (src/lib/ledger.ts).
 * Compat: mantém as assinaturas usadas pelas páginas existentes.
 * Backfill automático: na primeira leitura de um usuário sem Wallet, importa os
 * Charges PAID e Withdrawals históricos pro ledger (migração transparente).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";
import { getBalance as ledgerBalance } from "@/lib/ledger";

export { WITHDRAWAL_FEE_FIXED, computeWithdrawalFee } from "@/lib/fee";

/** Importa histórico pré-ledger (Charges/Withdrawals) para a Wallet recém-criada. */
async function backfillWallet(userId: string): Promise<void> {
  const [charges, withdrawals] = await Promise.all([
    prisma.charge.findMany({ where: { userId, status: "PAID" } }),
    prisma.withdrawal.findMany({
      where: { userId, status: { in: ["PENDING", "PROCESSING", "COMPLETED"] } },
    }),
  ]);

  await prisma.$transaction(async (tx) => {
    // upsert dentro da transação: se outra request criou a Wallet no meio, aborta silencioso
    const existing = await tx.wallet.findUnique({ where: { userId } });
    if (existing) return;

    const wallet = await tx.wallet.create({ data: { userId } });

    let total = new Prisma.Decimal(0);
    for (const c of charges) {
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "CHARGE_IN",
          amount: c.amount,
          refType: "Charge",
          refId: c.id,
          providerEventId: `backfill:charge:${c.id}`,
          description: `Backfill: cobrança de ${c.payerName}`,
        },
      });
      total = total.add(c.amount);
    }
    for (const w of withdrawals) {
      const neg = w.amount.neg();
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "PAYOUT",
          amount: neg,
          refType: "Withdrawal",
          refId: w.id,
          providerEventId: `backfill:withdrawal:${w.id}`,
          description: "Backfill: saque",
        },
      });
      total = total.add(neg);
    }

    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: total } });
  });
}

/**
 * Saldo disponível do usuário (ledger). Compatível com o comportamento anterior:
 * cobranças PAID menos saques não-falhos.
 */
export async function getBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    await backfillWallet(userId);
  }
  const value = await ledgerBalance(userId);
  return Math.round(toNumber(value) * 100) / 100;
}
