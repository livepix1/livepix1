/**
 * Criação + broadcast do AlertEvent de uma doação — compartilhado entre o
 * webhook do Asaas (doação sem mídia, ou já revisada) e a revisão manual de
 * voz (`reviewVoiceMessage`), pra nunca duplicar essa lógica.
 */

import type { AlertVariation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";
import { broadcastToWidget } from "@/lib/realtime";

interface DonationForAlert {
  id: string;
  creatorId: string;
  payerName: string;
  message: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
}

/**
 * Motor de match: escolhe qual AlertVariation do criador deve disparar pra
 * essa doação, com base em valor e palavra-chave na mensagem.
 *
 * Regras:
 * - Busca todas as variações do criador, ordenadas por `priority` desc.
 * - Entre as NÃO-padrão, retorna a primeira cujo critério bate:
 *   (minAmount nulo OU amount >= minAmount) E
 *   (maxAmount nulo OU amount <= maxAmount) E
 *   (keyword nulo OU message contém keyword, case-insensitive).
 * - Se nenhuma não-padrão bater, retorna a variação `isDefault: true`
 *   (fallback), independente do valor numérico de `priority` dela.
 * - Se o criador não tiver NENHUMA variação (caso legado), retorna `null` —
 *   quem chama deve cair pro `AlertConfig` atual, mantendo compatibilidade.
 */
export async function pickAlertVariation(
  creatorId: string,
  amount: number,
  message: string | null
): Promise<AlertVariation | null> {
  const variations = await prisma.alertVariation.findMany({
    where: { creatorId },
    orderBy: { priority: "desc" },
  });
  if (variations.length === 0) return null;

  const normalizedMessage = message?.toLowerCase() ?? "";
  let fallback: AlertVariation | null = null;

  for (const variation of variations) {
    if (variation.isDefault) {
      // Guarda a padrão pra usar como fallback no final; não entra na
      // checagem de critério (ela é o "senão").
      fallback = variation;
      continue;
    }

    const minOk = variation.minAmount === null || amount >= toNumber(variation.minAmount);
    const maxOk = variation.maxAmount === null || amount <= toNumber(variation.maxAmount);
    const keywordOk =
      !variation.keyword || normalizedMessage.includes(variation.keyword.toLowerCase());

    if (minOk && maxOk && keywordOk) {
      return variation;
    }
  }

  return fallback;
}

/**
 * Cria o AlertEvent (fonte de verdade) e faz o broadcast best-effort pro
 * widget. Idempotente por donationId — nunca cria um segundo evento pra
 * mesma doação. Respeita o `minAlertAmount` configurado pelo criador.
 */
export async function createAndBroadcastDonationAlert(
  donation: DonationForAlert,
  grossAmount: number,
  netAmount: number,
  flagged: boolean,
  mediaApproved: boolean
): Promise<void> {
  const alertConfig = await prisma.alertConfig.findUnique({
    where: { creatorId: donation.creatorId },
    select: { minAlertAmount: true },
  });
  const belowAlertMin = grossAmount < toNumber(alertConfig?.minAlertAmount ?? 0);

  const existing = await prisma.alertEvent.findFirst({
    where: { donationId: donation.id },
    select: { id: true },
  });
  if (existing || belowAlertMin) return;

  const finalMessage = flagged ? null : donation.message;
  const variation = await pickAlertVariation(donation.creatorId, grossAmount, finalMessage);

  const alertPayload = {
    payerName: donation.payerName,
    amount: netAmount,
    grossAmount,
    message: finalMessage,
    flagged,
    mediaUrl: donation.mediaUrl ?? undefined,
    mediaType: donation.mediaType ?? undefined,
    mediaApproved,
    // Campos da variação escolhida — só entram se o criador já tiver
    // alguma AlertVariation configurada (compatibilidade retroativa: quem
    // ainda usa só o AlertConfig legado não ganha esses campos extras).
    ...(variation
      ? {
          variationId: variation.id,
          soundUrl: variation.soundUrl ?? undefined,
          gifUrl: variation.gifUrl ?? undefined,
          durationMs: variation.durationMs ?? undefined,
          ttsEnabled: variation.ttsEnabled ?? undefined,
          ttsVoice: variation.ttsVoice ?? undefined,
          ttsProviderVoiceId: variation.ttsProviderVoiceId ?? undefined,
          ttsVolume: variation.ttsVolume ?? undefined,
          soundVolume: variation.soundVolume ?? undefined,
          readName: variation.readName,
          readAmount: variation.readAmount,
        }
      : {}),
  };

  const event = await prisma.alertEvent.create({
    data: {
      creatorId: donation.creatorId,
      donationId: donation.id,
      type: "DONATION",
      payload: alertPayload,
    },
  });

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: donation.creatorId },
    select: { widgetToken: true },
  });
  if (profile) {
    await broadcastToWidget(profile.widgetToken, {
      type: "alert",
      eventId: event.id,
      ...alertPayload,
    });
  }
}
