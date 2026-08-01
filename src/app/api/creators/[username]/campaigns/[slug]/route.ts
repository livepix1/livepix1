import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";

/** Valor atual arrecadado — usado pelo polling da página pública da campanha. */
export async function GET(
  _req: Request,
  { params }: { params: { username: string; slug: string } }
) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ raisedAmount: 0 });

  const campaign = await prisma.campaign.findFirst({
    where: { creatorId: user.id, slug: params.slug },
    select: { raisedAmount: true },
  });

  return NextResponse.json({ raisedAmount: toNumber(campaign?.raisedAmount) });
}
