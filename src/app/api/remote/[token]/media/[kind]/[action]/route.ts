import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMediaControlCommand } from "@/lib/actions/media-requests";

const QUEUE_ACTIONS = new Set(["skip", "pause", "resume", "clear"]);
const KINDS: Record<string, "VIDEO" | "MUSIC"> = { video: "VIDEO", music: "MUSIC" };

/**
 * Controle Remoto tipo StreamDeck pra fila de mídia (vídeo/música) — mesmo
 * padrão de `/api/remote/{token}/{action}` (alertas), autenticado só pelo
 * widgetToken (já secreto e regenerável).
 * GET /api/remote/{widgetToken}/media/{video|music}/{skip|pause|resume|clear}
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string; kind: string; action: string } }
) {
  const kind = KINDS[params.kind];
  if (!kind) {
    return NextResponse.json({ ok: false, error: "Kind inválido" }, { status: 400 });
  }
  if (!QUEUE_ACTIONS.has(params.action)) {
    return NextResponse.json({ ok: false, error: "Ação inválida" }, { status: 400 });
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { widgetToken: params.token },
    select: { userId: true },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 404 });
  }

  const result = await runMediaControlCommand(
    profile.userId,
    kind,
    params.action as "skip" | "pause" | "resume" | "clear"
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
