import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Estado do Widget de Maratona — polling público via widgetToken.
 * Auth = widgetToken secreto na URL (mesmo padrão de /pending).
 */
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

  const config = await prisma.marathonConfig.findUnique({
    where: { creatorId: profile.userId },
  });

  return NextResponse.json({
    isActive: config?.isActive ?? false,
    remainingSeconds: config?.remainingSeconds ?? 0,
    secondsPerReal: config?.secondsPerReal ?? 60,
  });
}
