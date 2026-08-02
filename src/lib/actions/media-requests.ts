"use server";

/**
 * Fila de pedidos de vídeo (YouTube) / música — widgets P1.
 * Mesmo padrão de `alerts.ts`: um núcleo sem sessão (`runMediaControlCommand`),
 * reusado tanto pelo painel (após `requireSession`) quanto pelo Controle Remoto
 * tipo StreamDeck (autenticado só pelo widgetToken, já secreto/regenerável).
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { mediaRequestSchema } from "@/lib/validators/media-request";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type MediaKind = "VIDEO" | "MUSIC";

function pathForKind(kind: MediaKind): string {
  return kind === "VIDEO" ? "/widgets/video" : "/widgets/musica";
}

/** Extrai o ID de um vídeo do YouTube de `watch?v=` ou `youtu.be/`. Null se não for YouTube. */
function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }
      const shortMatch = u.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/);
      if (shortMatch) return shortMatch[2];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cria um pedido de mídia pra doação já criada. Pública (sem login) — chamado
 * pelo doador anônimo logo após `createDonation`, mesmo padrão de segurança
 * de `attachDonationMedia` (donations.ts): só aceita doação existente e ainda
 * PENDING, pra nunca anexar um pedido a doação de outro criador ou já paga.
 */
export async function submitMediaRequest(
  donationId: string,
  kind: MediaKind,
  url: string,
  requesterName: string
): Promise<ActionResult> {
  const parsed = mediaRequestSchema.safeParse({ url, kind });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, status: true, creatorId: true },
  });
  if (!donation || donation.status !== "PENDING") {
    return { ok: false, error: "Doação inválida para anexar pedido" };
  }

  const title: string | null = null;
  let thumbnailUrl: string | null = null;
  if (parsed.data.kind === "VIDEO") {
    const videoId = extractYoutubeId(parsed.data.url);
    if (videoId) {
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  await prisma.mediaRequest.create({
    data: {
      creatorId: donation.creatorId,
      kind: parsed.data.kind,
      url: parsed.data.url,
      title,
      thumbnailUrl,
      requesterName: requesterName?.trim() || "Anônimo",
      status: "PENDING",
      donationId: donation.id,
    },
  });

  revalidatePath(pathForKind(parsed.data.kind));
  return { ok: true, message: "Pedido enviado" };
}

/** Fila atual (pendente + tocando) do criador logado, pro painel. */
export async function listMediaQueue(kind: MediaKind) {
  const session = await requireSession();
  return prisma.mediaRequest.findMany({
    where: { creatorId: session.user.id, kind, status: { in: ["PENDING", "PLAYING"] } },
    orderBy: { createdAt: "asc" },
  });
}

/** Remove (skip) um item da fila do criador logado. */
export async function removeMediaRequest(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const existing = await prisma.mediaRequest.findFirst({
    where: { id, creatorId: session.user.id },
  });
  if (!existing) return { ok: false, error: "Pedido não encontrado" };

  await prisma.mediaRequest.update({ where: { id }, data: { status: "SKIPPED" } });
  revalidatePath(pathForKind(existing.kind as MediaKind));
  return { ok: true, message: "Removido da fila" };
}

/** Marca um pedido como tocando agora — encerra (DONE) o que estava tocando antes, na mesma kind. */
export async function markMediaPlaying(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const existing = await prisma.mediaRequest.findFirst({
    where: { id, creatorId: session.user.id },
  });
  if (!existing) return { ok: false, error: "Pedido não encontrado" };

  await prisma.$transaction([
    prisma.mediaRequest.updateMany({
      where: {
        creatorId: session.user.id,
        kind: existing.kind,
        status: "PLAYING",
        id: { not: id },
      },
      data: { status: "DONE" },
    }),
    prisma.mediaRequest.update({
      where: { id },
      data: { status: "PLAYING", playedAt: new Date() },
    }),
  ]);

  revalidatePath(pathForKind(existing.kind as MediaKind));
  return { ok: true, message: "Tocando agora" };
}

/** Limpa (skip) toda a fila pendente/tocando do criador logado, de uma kind. */
export async function clearMediaQueue(kind: MediaKind): Promise<ActionResult> {
  const session = await requireSession();
  await clearMediaQueueForCreator(session.user.id, kind);
  revalidatePath(pathForKind(kind));
  return { ok: true, message: "Fila limpa" };
}

async function clearMediaQueueForCreator(creatorId: string, kind: MediaKind) {
  await prisma.mediaRequest.updateMany({
    where: { creatorId, kind, status: { in: ["PENDING", "PLAYING"] } },
    data: { status: "SKIPPED" },
  });
}

/**
 * Núcleo do controle remoto de mídia, sem exigir sessão — usado pelo
 * Controle Remoto tipo StreamDeck (autenticado só pelo widgetToken).
 * skip = encerra o que está tocando e avança pro próximo pendente.
 * pause/resume = sem estado de pausa persistente pra mídia hoje; no-op
 * best-effort (retorna ok, mas não faz nada) — o mais importante é
 * skip/clear funcionarem de verdade.
 * clear = mesma lógica de `clearMediaQueue`, recebendo o creatorId direto.
 */
export async function runMediaControlCommand(
  creatorId: string,
  kind: MediaKind,
  action: "skip" | "pause" | "resume" | "clear"
): Promise<ActionResult> {
  if (action === "pause" || action === "resume") {
    // Sem estado de pausa persistente pra fila de mídia — best-effort no-op.
    return { ok: true, message: "Comando recebido" };
  }

  if (action === "clear") {
    await clearMediaQueueForCreator(creatorId, kind);
    return { ok: true, message: "Fila limpa" };
  }

  // skip: marca o PLAYING atual como DONE e promove o próximo PENDING pra PLAYING.
  const playing = await prisma.mediaRequest.findFirst({
    where: { creatorId, kind, status: "PLAYING" },
    orderBy: { createdAt: "asc" },
  });
  const next = await prisma.mediaRequest.findFirst({
    where: {
      creatorId,
      kind,
      status: "PENDING",
      ...(playing ? { id: { not: playing.id } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  await prisma.$transaction([
    ...(playing
      ? [
          prisma.mediaRequest.update({
            where: { id: playing.id },
            data: { status: "DONE" },
          }),
        ]
      : []),
    ...(next
      ? [
          prisma.mediaRequest.update({
            where: { id: next.id },
            data: { status: "PLAYING", playedAt: new Date() },
          }),
        ]
      : []),
  ]);

  return { ok: true, message: "Pulado" };
}
