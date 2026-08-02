import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PollsPanel, type PollRow } from "./polls-panel";

export default async function EnquetesPage() {
  const user = await requireUser();
  const polls = await prisma.poll.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { options: true },
  });

  const rows: PollRow[] = polls.map((p) => ({
    id: p.id,
    question: p.question,
    isActive: p.isActive,
    options: p.options.map((o) => ({ id: o.id, label: o.label, voteCount: o.voteCount })),
  }));

  return (
    <>
      <PageHeader
        title="Enquetes"
        subtitle="Pergunte pro seu público e mostre o resultado na sua página pública."
      />
      <div className="max-w-2xl">
        <PollsPanel polls={rows} />
      </div>
    </>
  );
}
