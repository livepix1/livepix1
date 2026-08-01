"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { campaignSchema } from "@/lib/validators";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Cria uma campanha/vaquinha nova pro criador logado. Slug único por criador. */
export async function createCampaign(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  const slug = parsed.data.slug.trim().toLowerCase();
  const taken = await prisma.campaign.findFirst({
    where: { creatorId: userId, slug },
    select: { id: true },
  });
  if (taken) {
    return {
      ok: false,
      error: "Você já tem uma campanha com essa URL",
      fieldErrors: { slug: "Já está em uso" },
    };
  }

  const targetAmount =
    parsed.data.targetAmount === undefined || Number.isNaN(parsed.data.targetAmount)
      ? null
      : new Prisma.Decimal(parsed.data.targetAmount);

  await prisma.campaign.create({
    data: {
      creatorId: userId,
      slug,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      targetAmount,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      status: "ACTIVE",
    },
  });

  revalidatePath("/campanhas");
  return { ok: true, message: "Campanha criada" };
}

/** Encerra ou reativa uma campanha do criador logado. */
export async function setCampaignStatus(
  campaignId: string,
  status: "ACTIVE" | "ENDED"
): Promise<ActionResult> {
  const session = await requireSession();
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, creatorId: session.user.id },
  });
  if (!campaign) return { ok: false, error: "Campanha não encontrada" };

  await prisma.campaign.update({ where: { id: campaignId }, data: { status } });
  revalidatePath("/campanhas");
  return { ok: true };
}

/** Exclui uma campanha do criador logado (só se ainda não tiver doações). */
export async function deleteCampaign(campaignId: string): Promise<ActionResult> {
  const session = await requireSession();
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, creatorId: session.user.id },
    include: { _count: { select: { donations: true } } },
  });
  if (!campaign) return { ok: false, error: "Campanha não encontrada" };

  if (campaign._count.donations > 0) {
    // Tem histórico de doações — cancelar em vez de apagar preserva o extrato.
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "CANCELED" } });
    revalidatePath("/campanhas");
    return { ok: true, message: "Campanha cancelada (já tinha doações, não pode ser excluída)" };
  }

  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/campanhas");
  return { ok: true, message: "Campanha excluída" };
}
