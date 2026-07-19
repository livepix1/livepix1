import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ModerationList, type FlaggedDonation } from "./moderation-list";

export default async function ModeracaoPage() {
  const user = await requireUser();
  const flagged = await prisma.donation.findMany({
    where: { creatorId: user.id, moderationStatus: "FLAGGED" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const items: FlaggedDonation[] = flagged.map((d) => ({
    id: d.id,
    payerName: d.payerName,
    amount: toNumber(d.amount),
    message: d.message ?? "",
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Moderação"
        subtitle="Mensagens sinalizadas automaticamente ficam ocultas até você revisar."
      />
      <Card className="max-w-2xl">
        <ModerationList items={items} />
      </Card>
    </>
  );
}
