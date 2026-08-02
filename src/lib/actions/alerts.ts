"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { broadcastToWidget } from "@/lib/realtime";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const alertConfigSchema = z.object({
  soundUrl: z.string().url().optional().or(z.literal("")),
  gifUrl: z.string().url().optional().or(z.literal("")),
  durationMs: z.coerce.number().int().min(3000).max(30000),
  ttsEnabled: z.coerce.boolean(),
  ttsMinAmount: z.coerce.number().min(0),
  minAlertAmount: z.coerce.number().min(0),
});

async function getOwnProfile(userId: string) {
  return prisma.creatorProfile.findUnique({ where: { userId } });
}

export async function saveAlertConfig(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = alertConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  await prisma.alertConfig.upsert({
    where: { creatorId: session.user.id },
    update: {
      soundUrl: parsed.data.soundUrl || null,
      gifUrl: parsed.data.gifUrl || null,
      durationMs: parsed.data.durationMs,
      ttsEnabled: parsed.data.ttsEnabled,
      ttsMinAmount: new Prisma.Decimal(parsed.data.ttsMinAmount),
      minAlertAmount: new Prisma.Decimal(parsed.data.minAlertAmount),
    },
    create: {
      creatorId: session.user.id,
      soundUrl: parsed.data.soundUrl || null,
      gifUrl: parsed.data.gifUrl || null,
      durationMs: parsed.data.durationMs,
      ttsEnabled: parsed.data.ttsEnabled,
      ttsMinAmount: new Prisma.Decimal(parsed.data.ttsMinAmount),
      minAlertAmount: new Prisma.Decimal(parsed.data.minAlertAmount),
    },
  });

  // Avisa o widget pra recarregar a config.
  const profile = await getOwnProfile(session.user.id);
  if (profile) {
    await broadcastToWidget(profile.widgetToken, { type: "control", action: "sync" });
  }
  revalidatePath("/alertas");
  return { ok: true, message: "Configuração salva" };
}

/** Dispara um alerta de TESTE (vai pra fila real do widget). */
export async function sendTestAlert(): Promise<ActionResult> {
  const session = await requireSession();
  const profile = await getOwnProfile(session.user.id);
  if (!profile) return { ok: false, error: "Crie sua página primeiro" };

  const payload = {
    payerName: "PixLive",
    amount: 12.34,
    grossAmount: 12.34,
    message: "Isso é um alerta de teste! Tudo funcionando.",
    flagged: false,
  };
  const event = await prisma.alertEvent.create({
    data: { creatorId: session.user.id, type: "TEST", payload },
  });
  await broadcastToWidget(profile.widgetToken, {
    type: "alert",
    eventId: event.id,
    ...payload,
  });
  revalidatePath("/alertas");
  return { ok: true, message: "Alerta de teste enviado" };
}

/** Reenfileira um alerta já exibido (replay). */
export async function replayAlert(eventId: string): Promise<ActionResult> {
  const session = await requireSession();
  const profile = await getOwnProfile(session.user.id);
  if (!profile) return { ok: false, error: "Crie sua página primeiro" };

  const original = await prisma.alertEvent.findFirst({
    where: { id: eventId, creatorId: session.user.id },
  });
  if (!original) return { ok: false, error: "Alerta não encontrado" };

  const clone = await prisma.alertEvent.create({
    data: {
      creatorId: session.user.id,
      donationId: original.donationId,
      type: original.type,
      payload: original.payload as Prisma.InputJsonValue,
    },
  });
  await broadcastToWidget(profile.widgetToken, {
    type: "alert",
    eventId: clone.id,
  });
  revalidatePath("/alertas");
  return { ok: true, message: "Replay enviado" };
}

/**
 * Núcleo do controle de fila, sem exigir sessão — usado tanto pelo painel
 * (após requireSession) quanto pelo Controle Remoto tipo StreamDeck
 * (autenticado só pelo widgetToken, já secreto/regenerável).
 */
export async function runControlCommand(
  creatorId: string,
  action: "skip" | "pause" | "resume" | "clear"
): Promise<ActionResult> {
  const profile = await getOwnProfile(creatorId);
  if (!profile) return { ok: false, error: "Crie sua página primeiro" };

  if (action === "pause" || action === "resume") {
    await prisma.alertConfig.upsert({
      where: { creatorId },
      update: { paused: action === "pause" },
      create: { creatorId, paused: action === "pause" },
    });
  }
  if (action === "clear") {
    await prisma.alertEvent.updateMany({
      where: { creatorId, displayedAt: null, skippedAt: null },
      data: { skippedAt: new Date() },
    });
  }

  await broadcastToWidget(profile.widgetToken, { type: "control", action });
  return { ok: true, message: "Comando enviado" };
}

/** Controles da fila: skip do atual, pausar/retomar, limpar pendentes. */
export async function controlQueue(
  action: "skip" | "pause" | "resume" | "clear"
): Promise<ActionResult> {
  const session = await requireSession();
  const result = await runControlCommand(session.user.id, action);
  revalidatePath("/alertas");
  return result;
}

/** Reenfileira o último alerta exibido (usado pelo Controle Remoto — sem precisar escolher qual). */
export async function replayLatestAlert(creatorId: string): Promise<ActionResult> {
  const profile = await getOwnProfile(creatorId);
  if (!profile) return { ok: false, error: "Crie sua página primeiro" };

  const original = await prisma.alertEvent.findFirst({
    where: { creatorId, displayedAt: { not: null } },
    orderBy: { displayedAt: "desc" },
  });
  if (!original) return { ok: false, error: "Nenhum alerta exibido ainda" };

  const clone = await prisma.alertEvent.create({
    data: {
      creatorId,
      donationId: original.donationId,
      type: original.type,
      payload: original.payload as Prisma.InputJsonValue,
    },
  });
  await broadcastToWidget(profile.widgetToken, { type: "alert", eventId: clone.id });
  return { ok: true, message: "Replay enviado" };
}
