import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { toNumber } from "@/lib/serialize";

/** GET /api/v1/donations — lista as doações do criador dono da API key (escopo "read"). */
export async function GET(req: Request) {
  const userId = await authenticateApiKey(req, "read");
  if (!userId) {
    return NextResponse.json({ error: "API key inválida ou sem escopo 'read'" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Number(searchParams.get("limit")) || 20);

  const donations = await prisma.donation.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      payerName: true,
      amount: true,
      method: true,
      status: true,
      message: true,
      createdAt: true,
      paidAt: true,
    },
  });

  return NextResponse.json({
    data: donations.map((d) => ({ ...d, amount: toNumber(d.amount) })),
  });
}
