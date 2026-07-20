import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber, formatBRL } from "@/lib/serialize";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { DonateForm } from "./donate-form";
import { GoalsLive } from "./goals-live";
import { PlansSection, type PublicPlan } from "./plans-section";

export default async function CreatorPage({
  params,
}: {
  params: { username: string };
}) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    include: { creatorProfile: true },
  });
  if (!user?.creatorProfile?.isPublic) notFound();
  const profile = user.creatorProfile;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
  const [goals, topDonors, plans] = await Promise.all([
    prisma.goal.findMany({
      where: { creatorId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.donation.groupBy({
      by: ["payerName"],
      where: { creatorId: user.id, status: "PAID", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.creatorPlan.findMany({
      where: { creatorId: user.id, isActive: true },
      orderBy: { price: "asc" },
    }),
  ]);

  const publicPlans: PublicPlan[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: toNumber(p.price),
    rewards: Array.isArray(p.rewards) ? (p.rewards as string[]) : [],
  }));

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-neon-gradient opacity-60" />

      {/* Banner */}
      <div className="relative h-40 w-full overflow-hidden border-b border-white/10 bg-pixflow-darker sm:h-56">
        {profile.bannerUrl && (
          <Image
            src={profile.bannerUrl}
            alt=""
            fill
            className="object-cover opacity-70"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-pixflow-dark to-transparent" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        {/* Cabeçalho do criador */}
        <div className="-mt-12 mb-8 flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-pixflow-cyan/40 bg-pixflow-darker shadow-neon-cyan">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={profile.displayName}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="font-display text-3xl text-gradient-neon">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl">{profile.displayName}</h1>
          <p className="text-sm text-pixflow-cyan">@{user.username}</p>
          {profile.bio && (
            <p className="mt-2 max-w-md text-sm text-white/60">{profile.bio}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Coluna esquerda: metas + ranking */}
          <div className="order-2 grid content-start gap-6 lg:order-1">
            {goals.length > 0 && (
              <Card>
                <p className="mb-4 font-medium text-pixflow-slate">Metas</p>
                <GoalsLive
                  username={params.username}
                  initial={goals.map((g) => ({
                    id: g.id,
                    title: g.title,
                    targetAmount: toNumber(g.targetAmount),
                    currentAmount: toNumber(g.currentAmount),
                  }))}
                />
              </Card>
            )}

            <Card>
              <p className="mb-4 font-medium text-pixflow-slate">
                Maiores apoiadores (30 dias)
              </p>
              {topDonors.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/40">
                  Seja o primeiro a apoiar! 🚀
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

            {publicPlans.length > 0 && (
              <Card>
                <p className="mb-4 font-medium text-pixflow-slate">Assinaturas</p>
                <PlansSection plans={publicPlans} />
              </Card>
            )}
          </div>

          {/* Coluna direita: form de doação */}
          <div className="order-1 lg:order-2">
            <Card accent className="p-6">
              <p className="mb-4 font-medium text-pixflow-slate">
                Apoiar {profile.displayName}
              </p>
              <DonateForm
                username={params.username}
                creatorName={profile.displayName}
                minDonation={toNumber(profile.minDonation)}
                maxMessageLen={profile.maxMessageLen}
                goals={goals.map((g) => ({ id: g.id, title: g.title }))}
              />
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
