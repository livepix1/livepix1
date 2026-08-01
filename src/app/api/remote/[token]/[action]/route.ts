import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runControlCommand, replayLatestAlert } from "@/lib/actions/alerts";

const QUEUE_ACTIONS = new Set(["skip", "pause", "resume", "clear"]);

/**
 * Controle Remoto tipo StreamDeck: link GET autenticado só pelo widgetToken
 * (já secreto e regenerável — mesmo usado pra montar a URL do widget OBS),
 * pra colar como "Website action" no StreamDeck sem precisar abrir o dashboard.
 * GET /api/remote/{widgetToken}/{skip|pause|resume|clear|replay}
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string; action: string } }
) {
  const profile = await prisma.creatorProfile.findUnique({
    where: { widgetToken: params.token },
    select: { userId: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 404 });
  }

  if (params.action === "replay") {
    const result = await replayLatestAlert(profile.userId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (QUEUE_ACTIONS.has(params.action)) {
    const result = await runControlCommand(
      profile.userId,
      params.action as "skip" | "pause" | "resume" | "clear"
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ ok: false, error: "Ação inválida" }, { status: 400 });
}
