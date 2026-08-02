import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KINDS: Record<string, "VIDEO" | "MUSIC"> = { video: "VIDEO", music: "MUSIC" };

/**
 * Fila atual (PENDING+PLAYING) do widget de vídeo/música — o overlay consome
 * via polling. Auth = widgetToken secreto na URL, mesmo padrão de
 * `/api/widget/{token}/pending` (alertas).
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string; kind: string } }
) {
  const kind = KINDS[params.kind];
  if (!kind) {
    return NextResponse.json({ error: "Kind inválido" }, { status: 400 });
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { widgetToken: params.token },
    select: { userId: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Widget não encontrado" }, { status: 404 });
  }

  const items = await prisma.mediaRequest.findMany({
    where: { creatorId: profile.userId, kind, status: { in: ["PENDING", "PLAYING"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      kind: i.kind,
      url: i.url,
      title: i.title,
      thumbnailUrl: i.thumbnailUrl,
      requesterName: i.requesterName,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
