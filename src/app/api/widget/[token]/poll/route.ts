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
      // TODO(voteMode): o schema ainda não tem a coluna `voteMode` (SINGLE/WEIGHTED)
      // apesar de documentado no roadmap — fixo em "SINGLE" até a migration existir.
      voteMode: "SINGLE" as const,
      options: poll.options.map((o) => ({
        id: o.id,
        label: o.label,
        voteCount: o.voteCount,
      })),
    },
  });
}
