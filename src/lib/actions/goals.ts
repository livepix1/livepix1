"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const goalSchema = z.object({
  title: z.string().min(3, "Título muito curto").max(80),
  targetAmount: z.coerce.number().positive("O alvo precisa ser positivo"),
  endsAt: z.string().optional().or(z.literal("")),
});

export async function createGoal(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  await prisma.goal.create({
    data: {
      creatorId: session.user.id,
      title: parsed.data.title.trim(),
      targetAmount: new Prisma.Decimal(parsed.data.targetAmount),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
  });

  revalidatePath("/metas");
  return { ok: true, message: "Meta criada" };
}

export async function toggleGoal(goalId: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireSession();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, creatorId: session.user.id },
  });
  if (!goal) return { ok: false, error: "Meta não encontrada" };

  await prisma.goal.update({ where: { id: goalId }, data: { isActive } });
  revalidatePath("/metas");
  return { ok: true };
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  const session = await requireSession();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, creatorId: session.user.id },
  });
  if (!goal) return { ok: false, error: "Meta não encontrada" };

  await prisma.goal.delete({ where: { id: goalId } });
  revalidatePath("/metas");
  return { ok: true };
}
