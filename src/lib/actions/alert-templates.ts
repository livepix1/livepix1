"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** Galeria oficial + templates próprios do criador logado. */
export async function listTemplates() {
  const session = await requireSession();
  return prisma.alertTemplate.findMany({
    where: {
      OR: [{ isOfficial: true }, { creatorId: session.user.id }],
    },
    orderBy: [{ isOfficial: "desc" }, { createdAt: "desc" }],
  });
}

/** Copia os campos visuais de uma variação pra um template novo (não-oficial) do criador. */
export async function saveAsTemplate(variationId: string, name: string): Promise<ActionResult> {
  const session = await requireSession();
  const creatorId = session.user.id;

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 40) {
    return { ok: false, error: "Nome inválido" };
  }

  const variation = await prisma.alertVariation.findFirst({
    where: { id: variationId, creatorId },
  });
  if (!variation) return { ok: false, error: "Variação não encontrada" };

  await prisma.alertTemplate.create({
    data: {
      creatorId,
      name: trimmedName,
      soundUrl: variation.soundUrl,
      gifUrl: variation.gifUrl,
      durationMs: variation.durationMs ?? 8000,
      isOfficial: false,
    },
  });

  revalidatePath("/alertas");
  return { ok: true, message: "Template salvo" };
}

/**
 * Aplica soundUrl/gifUrl/durationMs de um template numa variação.
 * Templates oficiais podem ser aplicados por qualquer criador logado;
 * templates próprios só pelo dono.
 */
export async function applyTemplateToVariation(
  variationId: string,
  templateId: string
): Promise<ActionResult> {
  const session = await requireSession();
  const creatorId = session.user.id;

  const variation = await prisma.alertVariation.findFirst({
    where: { id: variationId, creatorId },
  });
  if (!variation) return { ok: false, error: "Variação não encontrada" };

  const template = await prisma.alertTemplate.findFirst({
    where: { id: templateId, OR: [{ isOfficial: true }, { creatorId }] },
  });
  if (!template) return { ok: false, error: "Template não encontrado" };

  await prisma.alertVariation.update({
    where: { id: variationId },
    data: {
      soundUrl: template.soundUrl,
      gifUrl: template.gifUrl,
      durationMs: template.durationMs,
      templateId: template.id,
    },
  });

  revalidatePath("/alertas");
  return { ok: true, message: "Template aplicado" };
}
