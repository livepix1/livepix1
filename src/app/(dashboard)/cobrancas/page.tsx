import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ChargesTable, type ChargeRow } from "./charges-table";

export default async function CobrancasPage() {
  const user = await requireUser();
  const charges = await prisma.charge.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Serializa Decimal->number e Date->ISO no boundary server->client.
  const rows: ChargeRow[] = charges.map((c) => ({
    id: c.id,
    payerName: c.payerName,
    payerEmail: c.payerEmail,
    amount: toNumber(c.amount),
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Cobranças"
        subtitle="Acompanhe todos os pagamentos recebidos pelo seu link."
      />
      <Card>
        <ChargesTable charges={rows} />
      </Card>
    </>
  );
}
