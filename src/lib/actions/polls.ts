"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { pollSchema } from "@/lib/validators/polls";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Cria uma enquete nova com suas opções pro criador logado. */
export async function createPoll(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = pollSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  await prisma.poll.create({
    data: {
      creatorId: session.user.id,
      question: parsed.data.question.trim(),
      options: {
        create: parsed.data.options.map((label) => ({ label: label.trim() })),
      },
    },
  });

  revalidatePath("/enquetes");
  return { ok: true, message: "Enquete criada" };
}

/** Encerra ou reativa uma enquete do criador logado. */
export async function setPollStatus(pollId: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireSession();
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, creatorId: session.user.id },
  });
  if (!poll) return { ok: false, error: "Enquete não encontrada" };

  await prisma.poll.update({ where: { id: pollId }, data: { isActive } });
  revalidatePath("/enquetes");
  return { ok: true };
}

/** Exclui uma enquete do criador logado. */
export async function deletePoll(pollId: string): Promise<ActionResult> {
  const session = await requireSession();
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, creatorId: session.user.id },
  });
  if (!poll) return { ok: false, error: "Enquete não encontrada" };

  await prisma.poll.delete({ where: { id: pollId } });
  revalidatePath("/enquetes");
  return { ok: true };
}

/** Voto público (visitante anônimo) numa opção de enquete. Sem dedup — MVP. */
export async function voteInPoll(pollOptionId: string): Promise<ActionResult> {
  const option = await prisma.pollOption.findUnique({ where: { id: pollOptionId } });
  if (!option) return { ok: false, error: "Opção não encontrada" };

  await prisma.pollOption.update({
    where: { id: pollOptionId },
    data: { voteCount: { increment: 1 } },
  });

  return { ok: true };
}
