import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { GoalsPanel, type GoalRow } from "./goals-panel";

export default async function MetasPage() {
  const user = await requireUser();
  const goals = await prisma.goal.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rows: GoalRow[] = goals.map((g) => ({
    id: g.id,
    title: g.title,
    targetAmount: toNumber(g.targetAmount),
    currentAmount: toNumber(g.currentAmount),
    isActive: g.isActive,
    endsAt: g.endsAt ? g.endsAt.toISOString() : null,
  }));

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle="Barras de progresso que aparecem na sua página pública."
      />
      <div className="max-w-2xl">
        <GoalsPanel goals={rows} />
      </div>
    </>
  );
}
