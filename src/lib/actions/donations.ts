"use server";

import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { donationSchema } from "@/lib/validators";
import { toNumber } from "@/lib/serialize";
import { getProvider, getCreatorSplit, ProviderNotConfiguredError } from "@/lib/payments";
import { checkRateLimit } from "@/lib/rate-limit";
import { uploadDonationMedia } from "@/lib/media-upload";

export type DonationResult =
  | {
      ok: true;
      donationId: string;
      qrImage: string;
      pixCode: string;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Cria uma doação PENDING para o criador e gera o QR PIX (público, sem login). */
export async function createDonation(
  username: string,
  input: unknown
): Promise<DonationResult> {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // 20 doações/10min por IP — mitiga abuso sem incomodar quem só está testando valores.
  const allowed = await checkRateLimit(`donation:${ip}`, 20, 10 * 60 * 1000);
  if (!allowed) {
    return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const parsed = donationSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { creatorProfile: true },
  });
  if (!user?.creatorProfile?.isPublic) {
    return { ok: false, error: "Criador não encontrado" };
  }

  const profile = user.creatorProfile;
  const amount = parsed.data.amount;

  if (amount < toNumber(profile.minDonation)) {
    return {
      ok: false,
      error: `Valor mínimo: R$ ${toNumber(profile.minDonation).toFixed(2)}`,
      fieldErrors: { amount: "Abaixo do mínimo" },
    };
  }

  const message = parsed.data.message?.trim().slice(0, profile.maxMessageLen) || null;
  const payerName = parsed.data.payerName?.trim() || "Anônimo";

  // Meta ativa (se informada) precisa pertencer ao criador.
  let goalId: string | null = null;
  if (parsed.data.goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: parsed.data.goalId, creatorId: user.id, isActive: true },
      select: { id: true },
    });
    goalId = goal?.id ?? null;
  }

  // Campanha ativa (se informada) precisa pertencer ao criador.
  let campaignId: string | null = null;
  if (parsed.data.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: parsed.data.campaignId, creatorId: user.id, status: "ACTIVE" },
      select: { id: true },
    });
    campaignId = campaign?.id ?? null;
  }

  const donation = await prisma.donation.create({
    data: {
      creatorId: user.id,
      payerName,
      payerEmail: parsed.data.payerEmail?.trim() || null,
      message,
      amount: new Prisma.Decimal(amount),
      method: "PIX",
      status: "PENDING",
      goalId,
      campaignId,
    },
  });

  try {
    const provider = getProvider();
    const split = await getCreatorSplit(user.id, "PIX");
    const charge = await provider.createPixCharge({
      customerName: payerName,
      customerEmail: parsed.data.payerEmail?.trim() || "doador@pixlive.app",
      value: amount,
      description: `Apoio para ${profile.displayName}`,
      externalReference: `donation:${donation.id}`,
      ...split,
    });

    await prisma.donation.update({
      where: { id: donation.id },
      data: { providerId: charge.providerId, receiptUrl: charge.receiptUrl ?? null },
    });

    return {
      ok: true,
      donationId: donation.id,
      qrImage: charge.qrImage,
      pixCode: charge.pixCode,
    };
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) {
      return {
        ok: false,
        error:
          "Pagamentos ainda não estão ativos nesta conta. Tente novamente em breve.",
      };
    }
    return { ok: false, error: "Erro ao gerar o pagamento. Tente novamente." };
  }
}

/** Status de uma doação (polling da página pública). */
export async function getDonationStatus(donationId: string): Promise<string | null> {
  const d = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { status: true },
  });
  return d?.status ?? null;
}

export type AttachMediaResult = { ok: true } | { ok: false; error: string };

// Base64 decodificado até ~2MB — dá pra um áudio de até 15s tranquilo; barra abuso.
const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

/**
 * Anexa uma gravação de áudio/vídeo do doador a uma doação já criada.
 * Público (sem login) — chamado logo após `createDonation`, ainda na mesma
 * submissão do formulário. Só aceita se a doação existir e ainda estiver
 * PENDING, pra nunca sobrescrever/anexar mídia numa doação de outro criador
 * ou já concluída por engano.
 */
export async function attachDonationMedia(
  donationId: string,
  base64Data: string,
  mediaType: "AUDIO" | "VIDEO"
): Promise<AttachMediaResult> {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = await checkRateLimit(`donation-media:${ip}`, 20, 10 * 60 * 1000);
  if (!allowed) {
    return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  if (mediaType !== "AUDIO" && mediaType !== "VIDEO") {
    return { ok: false, error: "Tipo de mídia inválido" };
  }
  if (!base64Data || typeof base64Data !== "string") {
    return { ok: false, error: "Mídia inválida" };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    return { ok: false, error: "Mídia inválida" };
  }
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. ~2MB)" };
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, status: true },
  });
  // Só anexa em doação existente e ainda PENDING — evita anexar mídia em
  // doação de outro criador (ou já paga/expirada) por engano.
  if (!donation || donation.status !== "PENDING") {
    return { ok: false, error: "Doação inválida para anexar mídia" };
  }

  const mimeType = mediaType === "AUDIO" ? "audio/webm" : "video/webm";
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const mediaUrl = await uploadDonationMedia(blob, donation.id);
  if (!mediaUrl) {
    // Storage não configurado (ou upload falhou) — best-effort, não quebra a doação.
    return { ok: false, error: "Upload de mídia indisponível no momento" };
  }

  // updateMany com o filtro de status como guarda extra contra corrida
  // (a doação pode ter sido paga entre o findUnique acima e aqui).
  const result = await prisma.donation.updateMany({
    where: { id: donation.id, status: "PENDING" },
    data: { mediaUrl, mediaType },
  });
  if (result.count === 0) {
    return { ok: false, error: "Doação inválida para anexar mídia" };
  }

  return { ok: true };
}
