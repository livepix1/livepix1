import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Marca um alerta como exibido (ack do widget). Auth = widgetToken. */
export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const profile = await prisma.creatorProfile.findUnique({
    where: { widgetToken: params.token },
    select: { userId: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Widget não encontrado" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { eventId?: string } | null;
  if (!body?.eventId) {
    return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });
  }

  await prisma.alertEvent.updateMany({
    where: { id: body.eventId, creatorId: profile.userId, displayedAt: null },
    data: { displayedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
