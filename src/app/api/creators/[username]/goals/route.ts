import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";

/** Valores atuais das metas ativas — usado pelo polling da página pública. */
export async function GET(
  _req: Request,
  { params }: { params: { username: string } }
) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ goals: [] });

  const goals = await prisma.goal.findMany({
    where: { creatorId: user.id, isActive: true },
    select: { id: true, currentAmount: true },
  });

  return NextResponse.json({
    goals: goals.map((g) => ({ id: g.id, currentAmount: toNumber(g.currentAmount) })),
  });
}
