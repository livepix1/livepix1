"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const planSchema = z.object({
  name: z.string().min(3, "Nome muito curto").max(60),
  description: z.string().max(300).optional().or(z.literal("")),
  price: z.coerce.number().positive("O preço precisa ser positivo"),
  rewards: z.string().max(500).optional().or(z.literal("")), // uma vantagem por linha
  discordRoleId: z.string().max(40).optional().or(z.literal("")),
  telegramGroupId: z.string().max(40).optional().or(z.literal("")),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fe: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !fe[k]) fe[k] = i.message;
  }
  return fe;
}

export async function createPlan(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const rewardsList = (parsed.data.rewards ?? "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);

  await prisma.creatorPlan.create({
    data: {
      creatorId: session.user.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      price: new Prisma.Decimal(parsed.data.price),
      rewards: rewardsList,
      discordRoleId: parsed.data.discordRoleId?.trim() || null,
      telegramGroupId: parsed.data.telegramGroupId?.trim() || null,
    },
  });

  revalidatePath("/assinaturas");
  return { ok: true, message: "Plano criado" };
}

export async function togglePlan(planId: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireSession();
  const plan = await prisma.creatorPlan.findFirst({
    where: { id: planId, creatorId: session.user.id },
  });
  if (!plan) return { ok: false, error: "Plano não encontrado" };

  await prisma.creatorPlan.update({ where: { id: planId }, data: { isActive } });
  revalidatePath("/assinaturas");
  return { ok: true };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const session = await requireSession();
  const plan = await prisma.creatorPlan.findFirst({
    where: { id: planId, creatorId: session.user.id },
  });
  if (!plan) return { ok: false, error: "Plano não encontrado" };

  await prisma.creatorPlan.delete({ where: { id: planId } });
  revalidatePath("/assinaturas");
  return { ok: true };
}
