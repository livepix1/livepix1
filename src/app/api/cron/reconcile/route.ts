import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listReceivedPayments, isAsaasConfigured, AsaasNotConfiguredError } from "@/lib/asaas-client";
import { decrypt } from "@/lib/crypto";
import { toNumber } from "@/lib/serialize";

/**
 * Concilia Donations PAID (últimas 24h) contra o extrato real do Asaas, por
 * subconta do criador. Não corrige nada sozinho — só loga divergências pra
 * investigação manual (append-only, sem tocar em dinheiro).
 *
 * INERTE-safe: se o Asaas não estiver configurado, não faz nada.
 * Protegida por CRON_SECRET (header Authorization: Bearer <secret>), padrão do
 * Vercel Cron — sem o secret configurado, aceita qualquer chamada (dev local).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && secret.trim()) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  if (!isAsaasConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Asaas não configurado" });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const accounts = await prisma.providerAccount.findMany({
    where: { kycStatus: "APPROVED", apiKeyEnc: { not: null } },
  });

  const report: {
    creatorId: string;
    mismatches: { providerId: string; reason: string }[];
  }[] = [];

  for (const account of accounts) {
    if (!account.apiKeyEnc) continue;

    let apiKey: string;
    try {
      apiKey = decrypt(account.apiKeyEnc);
    } catch {
      report.push({
        creatorId: account.userId,
        mismatches: [{ providerId: "-", reason: "Falha ao decifrar apiKey" }],
      });
      continue;
    }

    let payments;
    try {
      payments = await listReceivedPayments({ apiKey, dateCreatedGe: since });
    } catch (err) {
      if (err instanceof AsaasNotConfiguredError) continue;
      report.push({
        creatorId: account.userId,
        mismatches: [{ providerId: "-", reason: "Erro ao consultar Asaas" }],
      });
      continue;
    }

    const donations = await prisma.donation.findMany({
      where: {
        creatorId: account.userId,
        status: "PAID",
        paidAt: { gte: new Date(since) },
      },
      select: { providerId: true, amount: true },
    });
    const donationByProviderId = new Map(donations.map((d) => [d.providerId, d]));

    const mismatches: { providerId: string; reason: string }[] = [];
    for (const payment of payments) {
      const donation = donationByProviderId.get(payment.id);
      if (!donation) {
        mismatches.push({
          providerId: payment.id,
          reason: "Pagamento recebido no Asaas sem Donation PAID correspondente",
        });
        continue;
      }
      if (Math.abs(toNumber(donation.amount) - payment.value) > 0.01) {
        mismatches.push({
          providerId: payment.id,
          reason: `Valor divergente: Donation=${toNumber(donation.amount)} Asaas=${payment.value}`,
        });
      }
    }

    if (mismatches.length > 0) {
      report.push({ creatorId: account.userId, mismatches });
    }
  }

  if (report.length > 0) {
    console.error("[reconcile] Divergências encontradas:", JSON.stringify(report));
  }

  return NextResponse.json({ checked: accounts.length, mismatches: report });
}
