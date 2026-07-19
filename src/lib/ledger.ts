/**
 * Ledger financeiro APPEND-ONLY.
 * Regras invioláveis:
 *  - LedgerEntry NUNCA sofre UPDATE ou DELETE (correção = novo lançamento ADJUSTMENT).
 *  - Todo lançamento vindo de webhook passa providerEventId → idempotência garantida
 *    pelo unique do banco (retry do provider não duplica dinheiro).
 *  - Wallet.balance é cache derivado, atualizado na MESMA transação do lançamento.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";

export type LedgerType =
  | "DONATION_IN"
  | "CHARGE_IN"
  | "SUB_IN"
  | "FEE"
  | "PAYOUT"
  | "ADJUSTMENT";

export interface PostEntryInput {
  userId: string;
  type: LedgerType;
  /** valor com sinal: crédito positivo, débito negativo */
  amount: number;
  refType?: string;
  refId?: string;
  /** id único do evento no provider — garante idempotência */
  providerEventId?: string;
  description?: string;
}

/** Garante que o usuário tem Wallet (cria com saldo 0 se não tiver). */
export async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/**
 * Lança uma entrada no ledger e atualiza o saldo na mesma transação.
 * Retorna null se o providerEventId já foi processado (idempotente, sem erro).
 */
export async function postEntry(input: PostEntryInput) {
  const wallet = await ensureWallet(input.userId);

  try {
    return await prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: input.type,
          amount: new Prisma.Decimal(input.amount),
          refType: input.refType ?? null,
          refId: input.refId ?? null,
          providerEventId: input.providerEventId ?? null,
          description: input.description ?? null,
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: new Prisma.Decimal(input.amount) } },
      });
      return entry;
    });
  } catch (err) {
    // P2002 = unique violation em providerEventId → evento já processado (retry do provider).
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return null;
    }
    throw err;
  }
}

/** Lança várias entradas atomicamente (ex.: DONATION_IN + FEE do mesmo pagamento). */
export async function postEntries(userId: string, entries: Omit<PostEntryInput, "userId">[]) {
  const wallet = await ensureWallet(userId);
  const total = entries.reduce((s, e) => s + e.amount, 0);

  try {
    return await prisma.$transaction(async (tx) => {
      const created = [];
      for (const e of entries) {
        created.push(
          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              type: e.type,
              amount: new Prisma.Decimal(e.amount),
              refType: e.refType ?? null,
              refId: e.refId ?? null,
              providerEventId: e.providerEventId ?? null,
              description: e.description ?? null,
            },
          })
        );
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: new Prisma.Decimal(total) } },
      });
      return created;
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return null;
    }
    throw err;
  }
}

/** Saldo atual (cache da Wallet — derivado do ledger). */
export async function getBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet ? toNumber(wallet.balance) : 0;
}

/** Recalcula o saldo direto do ledger (verificação de integridade/conciliação). */
export async function getBalanceFromLedger(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return 0;
  const agg = await prisma.ledgerEntry.aggregate({
    where: { walletId: wallet.id },
    _sum: { amount: true },
  });
  return toNumber(agg._sum.amount);
}
