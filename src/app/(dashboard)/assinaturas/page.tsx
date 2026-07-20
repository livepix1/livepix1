import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PlansPanel, type PlanRow } from "./plans-panel";

export default async function AssinaturasPage() {
  const user = await requireUser();
  const plans = await prisma.creatorPlan.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
  });

  const rows: PlanRow[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: toNumber(p.price),
    isActive: p.isActive,
    activeSubscribers: p._count.subscriptions,
    discordRoleId: p.discordRoleId,
    telegramGroupId: p.telegramGroupId,
  }));

  return (
    <>
      <PageHeader
        title="Assinaturas"
        subtitle="Planos recorrentes com recompensas para seus apoiadores fiéis."
      />
      <div className="max-w-2xl">
        <PlansPanel plans={rows} />
      </div>
    </>
  );
}
