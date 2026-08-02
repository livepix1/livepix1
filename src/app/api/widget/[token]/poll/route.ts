import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Enquete ativa do criador (widget de overlay OBS).
 * Auth = widgetToken secreto na URL, mesmo padrão de /api/widget/[token]/pending.
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

  const poll = await prisma.poll.findFirst({
    where: { creatorId: profile.userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { options: true },
  });

  if (!poll) {
    return NextResponse.json({ poll: null });
  }

  return NextResponse.json({
    poll: {
      id: poll.id,
      question: poll.question,
      // SINGLE hoje; WEIGHTED (voto por valor doado) tem a coluna pronta no
      // schema mas a lógica de peso ainda não foi construída — ver PROJETO.md.
      voteMode: poll.voteMode,
      options: poll.options.map((o) => ({
        id: o.id,
        label: o.label,
        voteCount: o.voteCount,
      })),
    },
  });
}
