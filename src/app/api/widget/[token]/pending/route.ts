import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";

/**
 * Fila pendente do widget (fonte de verdade dos alertas).
 * Auth = widgetToken secreto na URL. O widget chama no load e a cada reconexão —
 * é o que garante que NENHUM alerta se perde se o Realtime falhar.
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

  const [config, events] = await Promise.all([
    prisma.alertConfig.findUnique({ where: { creatorId: profile.userId } }),
    prisma.alertEvent.findMany({
      where: { creatorId: profile.userId, displayedAt: null, skippedAt: null },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    config: {
      soundUrl: config?.soundUrl ?? null,
      gifUrl: config?.gifUrl ?? null,
      durationMs: config?.durationMs ?? 8000,
      ttsEnabled: config?.ttsEnabled ?? true,
      ttsVoice: config?.ttsVoice ?? null,
      ttsMinAmount: toNumber(config?.ttsMinAmount ?? 0),
      minAlertAmount: toNumber(config?.minAlertAmount ?? 0),
      paused: config?.paused ?? false,
    },
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
