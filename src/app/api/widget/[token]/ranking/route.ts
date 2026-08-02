import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";

/**
 * Ranking de maiores doadores da transmissão (widget público, auth via widgetToken).
 * Período configurável via ?period= today|week|month|all — default month.
 */

const PERIOD_VALUES = ["today", "week", "month", "all"] as const;
type Period = (typeof PERIOD_VALUES)[number];

function isPeriod(value: string | null): value is Period {
  return value !== null && (PERIOD_VALUES as readonly string[]).includes(value);
}

function startDateFor(period: Period): Date | null {
  const now = Date.now();
  switch (period) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week":
      return new Date(now - 7 * 864e5);
    case "month":
      return new Date(now - 30 * 864e5);
    case "all":
      return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const profile = await prisma.creatorProfile.findUnique({
    where: { widgetToken: params.token },
  });
  if (!profile) {
    return NextResponse.json({ error: "Widget não encontrado" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const rawPeriod = searchParams.get("period");
  const period: Period = isPeriod(rawPeriod) ? rawPeriod : "month";
  const gte = startDateFor(period);

  const grouped = await prisma.donation.groupBy({
    by: ["payerName"],
    where: {
      creatorId: profile.userId,
      status: "PAID",
      ...(gte ? { createdAt: { gte } } : {}),
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });

  return NextResponse.json({
    ranking: grouped.map((g) => ({
      payerName: g.payerName,
      total: toNumber(g._sum.amount),
    })),
    period,
  });
}
