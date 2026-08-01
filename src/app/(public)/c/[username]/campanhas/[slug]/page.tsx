import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber, formatBRL } from "@/lib/serialize";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { DonateForm } from "../../donate-form";
import { CampaignProgress } from "./campaign-progress";

export default async function CampaignPage({
  params,
}: {
  params: { username: string; slug: string };
}) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    include: { creatorProfile: true },
  });
  if (!user?.creatorProfile?.isPublic) notFound();

  const campaign = await prisma.campaign.findFirst({
    where: { creatorId: user.id, slug: params.slug },
  });
  if (!campaign || campaign.status === "CANCELED") notFound();

  const profile = user.creatorProfile;

  const topDonors = await prisma.donation.groupBy({
    by: ["payerName"],
    where: { campaignId: campaign.id, status: "PAID" },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-neon-gradient opacity-60" />

      <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-sm text-pixflow-cyan">
            Campanha de {profile.displayName} (@{user.username})
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{campaign.title}</h1>
          {campaign.status === "ENDED" && (
            <span className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
              Campanha encerrada
            </span>
          )}
          {campaign.description && (
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">{campaign.description}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="order-2 grid content-start gap-6 lg:order-1">
            <Card accent>
              <CampaignProgress
                username={params.username}
                slug={params.slug}
                targetAmount={campaign.targetAmount ? toNumber(campaign.targetAmount) : null}
                initialRaised={toNumber(campaign.raisedAmount)}
              />
            </Card>

            <Card>
              <p className="mb-4 font-medium text-pixflow-slate">Quem já contribuiu</p>
              {topDonors.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/40">
                  Seja o primeiro a contribuir! 🚀
                </p>
              ) : (
                <ol className="grid gap-2">
                  {topDonors.map((d, i) => (
                    <li
                      key={d.payerName + i}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-pixflow-dark px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-pixflow-slate">
                        <span className="font-display text-pixflow-cyan">{i + 1}º</span>
                        {d.payerName}
                      </span>
                      <span className="text-sm text-white/60">
                        {formatBRL(toNumber(d._sum.amount))}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <div className="order-1 lg:order-2">
            <Card accent className="p-6">
              <p className="mb-4 font-medium text-pixflow-slate">Contribuir</p>
              {campaign.status === "ACTIVE" ? (
                <DonateForm
                  username={params.username}
                  creatorName={profile.displayName}
                  minDonation={toNumber(profile.minDonation)}
                  maxMessageLen={profile.maxMessageLen}
                  goals={[]}
                  campaignId={campaign.id}
                />
              ) : (
                <p className="py-6 text-center text-sm text-white/40">
                  Essa campanha não está mais recebendo contribuições.
                </p>
              )}
            </Card>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Logo />
        </div>
      </div>
    </main>
  );
}
