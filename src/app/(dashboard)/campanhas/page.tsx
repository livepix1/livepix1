import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CampaignsPanel, type CampaignRow } from "./campaigns-panel";

export default async function CampanhasPage() {
  const user = await requireUser();
  const campaigns = await prisma.campaign.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    targetAmount: c.targetAmount ? toNumber(c.targetAmount) : null,
    raisedAmount: toNumber(c.raisedAmount),
    status: c.status,
  }));

  return (
    <>
      <PageHeader
        title="Campanhas"
        subtitle="Vaquinhas com meta, barra de progresso e página própria pra compartilhar."
      />
      <div className="max-w-2xl">
        <CampaignsPanel username={user.username} campaigns={rows} />
      </div>
    </>
  );
}
