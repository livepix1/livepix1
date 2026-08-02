"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { alertVariationSchema } from "@/lib/validators/alert-variations";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function toDecimalOrNull(value: number | undefined): Prisma.Decimal | null {
  return value === undefined ? null : new Prisma.Decimal(value);
}

function parseInput(input: unknown) {
  const parsed = alertVariationSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false as const, error: "Dados inválidos", fieldErrors: fe };
  }
  return { ok: true as const, data: parsed.data };
}

/** Cria uma variação de alerta nova pro criador logado. */
export async function createAlertVariation(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const creatorId = session.user.id;

  const parsed = parseInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
  }
  const data = parsed.data;

  const existingCount = await prisma.alertVariation.count({ where: { creatorId } });
  const isFirst = existingCount === 0;

  let priority = 0;
  if (!isFirst) {
    const highest = await prisma.alertVariation.findFirst({
      where: { creatorId },
      orderBy: { priority: "desc" },
      select: { priority: true },
    });
    priority = (highest?.priority ?? 0) + 1;
  }

  await prisma.alertVariation.create({
    data: {
      creatorId,
      name: data.name.trim(),
      isDefault: isFirst,
      priority,
      minAmount: toDecimalOrNull(data.minAmount),
      maxAmount: toDecimalOrNull(data.maxAmount),
      keyword: data.keyword || null,
      soundUrl: data.soundUrl || null,
      gifUrl: data.gifUrl || null,
      durationMs: data.durationMs ?? null,
      ttsEnabled: data.ttsEnabled ?? null,
      ttsVoice: data.ttsVoice || null,
      ttsProviderVoiceId: data.ttsProviderVoiceId || null,
      ttsVolume: data.ttsVolume ?? null,
      soundVolume: data.soundVolume ?? null,
      readName: data.readName,
      readAmount: data.readAmount,
    },
  });

  revalidatePath("/alertas");
  return { ok: true, message: "Variação criada" };
}

/** Edita uma variação existente (valida ownership). */
export async function updateAlertVariation(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const creatorId = session.user.id;

  const existing = await prisma.alertVariation.findFirst({ where: { id, creatorId } });
  if (!existing) return { ok: false, error: "Variação não encontrada" };

  const parsed = parseInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
  }
  const data = parsed.data;

  await prisma.alertVariation.update({
    where: { id },
    data: {
      name: data.name.trim(),
      minAmount: toDecimalOrNull(data.minAmount),
      maxAmount: toDecimalOrNull(data.maxAmount),
      keyword: data.keyword || null,
      soundUrl: data.soundUrl || null,
      gifUrl: data.gifUrl || null,
      durationMs: data.durationMs ?? null,
      ttsEnabled: data.ttsEnabled ?? null,
      ttsVoice: data.ttsVoice || null,
      ttsProviderVoiceId: data.ttsProviderVoiceId || null,
      ttsVolume: data.ttsVolume ?? null,
      soundVolume: data.soundVolume ?? null,
      readName: data.readName,
      readAmount: data.readAmount,
    },
  });

  revalidatePath("/alertas");
  return { ok: true, message: "Variação atualizada" };
}

/** Exclui uma variação (nunca a padrão — sempre precisa sobrar uma). */
export async function deleteAlertVariation(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const creatorId = session.user.id;

  const existing = await prisma.alertVariation.findFirst({ where: { id, creatorId } });
  if (!existing) return { ok: false, error: "Variação não encontrada" };

  if (existing.isDefault) {
    return { ok: false, error: "Não é possível excluir a variação padrão" };
  }

  await prisma.alertVariation.delete({ where: { id } });
  revalidatePath("/alertas");
  return { ok: true, message: "Variação excluída" };
}

/** Marca uma variação como padrão e desmarca a anterior. */
export async function setDefaultVariation(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const creatorId = session.user.id;

  const target = await prisma.alertVariation.findFirst({ where: { id, creatorId } });
  if (!target) return { ok: false, error: "Variação não encontrada" };
  if (target.isDefault) return { ok: true, message: "Já é a variação padrão" };

  const previousDefault = await prisma.alertVariation.findFirst({
    where: { creatorId, isDefault: true },
  });

  await prisma.$transaction([
    ...(previousDefault
      ? [
          prisma.alertVariation.update({
            where: { id: previousDefault.id },
            data: { isDefault: false },
          }),
        ]
      : []),
    prisma.alertVariation.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/alertas");
  return { ok: true, message: "Variação padrão atualizada" };
}

/**
 * Reatribui `priority` conforme a nova ordem recebida — o primeiro ID da
 * lista fica com a maior prioridade (checado primeiro pelo motor de match).
 */
export async function reorderVariations(orderedIds: string[]): Promise<ActionResult> {
  const session = await requireSession();
  const creatorId = session.user.id;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "Lista inválida" };
  }

  const owned = await prisma.alertVariation.findMany({
    where: { creatorId, id: { in: orderedIds } },
    select: { id: true },
  });
  if (owned.length !== orderedIds.length) {
    return { ok: false, error: "Uma ou mais variações não pertencem a você" };
  }

  const total = orderedIds.length;
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.alertVariation.update({
        where: { id },
        data: { priority: total - index },
      })
    )
  );

  revalidatePath("/alertas");
  return { ok: true, message: "Ordem atualizada" };
}
