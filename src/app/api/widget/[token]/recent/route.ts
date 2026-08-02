import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";

/**
 * Últimos incentivos recebidos (doações + assinaturas), widget público
 * auth via widgetToken. Combina os dois tipos ordenados por data, 10 mais recentes.
 */

interface RecentItem {
  type: "DONATION" | "SUBSCRIPTION";
  name: string;
  amount?: number;
  planName?: string;
  date: string;
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const profile = await prisma.creatorProfile.findUnique({
    where: { widgetToken: params.token },
  });
  if (!profile) {
    return NextResponse.json({ error: "Widget não encontrado" }, { status: 404 });
  }

  const [donations, subscriptions] = await Promise.all([
    prisma.donation.findMany({
      where: { creatorId: profile.userId, status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 10,
    }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", plan: { creatorId: profile.userId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { plan: true },
    }),
  ]);

  const items: RecentItem[] = [
    ...donations.map(
      (d): RecentItem => ({
        type: "DONATION",
        name: d.payerName,
        amount: toNumber(d.amount),
        date: (d.paidAt ?? d.createdAt).toISOString(),
      })
    ),
    ...subscriptions.map(
      (s): RecentItem => ({
        type: "SUBSCRIPTION",
        name: s.subscriberName,
        planName: s.plan.name,
        date: s.createdAt.toISOString(),
      })
    ),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return NextResponse.json({ items });
}
