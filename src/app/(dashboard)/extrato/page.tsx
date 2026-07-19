import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ExtratoTable, type LedgerRow } from "./extrato-table";

export default async function ExtratoPage() {
  const user = await requireUser();
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

  const entries = wallet
    ? await prisma.ledgerEntry.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  // Busca comprovantes das doações referenciadas (evita N+1 com um único IN).
  const donationIds = entries
    .filter((e) => e.refType === "Donation" && e.refId)
    .map((e) => e.refId as string);
  const donations = donationIds.length
    ? await prisma.donation.findMany({
        where: { id: { in: donationIds } },
        select: { id: true, receiptUrl: true },
      })
    : [];
  const receiptByDonation = new Map(donations.map((d) => [d.id, d.receiptUrl]));

  const rows: LedgerRow[] = entries.map((e) => ({
    id: e.id,
    type: e.type,
    amount: toNumber(e.amount),
    description: e.description,
    refType: e.refType,
    receiptUrl: e.refType === "Donation" && e.refId ? receiptByDonation.get(e.refId) ?? null : null,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Extrato"
        subtitle="Cada movimentação, com comprovante — nada some, nada fica sem explicação."
      />
      <Card>
        <ExtratoTable rows={rows} />
      </Card>
    </>
  );
}
