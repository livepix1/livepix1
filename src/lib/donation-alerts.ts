/**
 * Criação + broadcast do AlertEvent de uma doação — compartilhado entre o
 * webhook do Asaas (doação sem mídia, ou já revisada) e a revisão manual de
 * voz (`reviewVoiceMessage`), pra nunca duplicar essa lógica.
 */

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

  const alertPayload = {
    payerName: donation.payerName,
    amount: netAmount,
    grossAmount,
    message: flagged ? null : donation.message,
    flagged,
    mediaUrl: donation.mediaUrl ?? undefined,
    mediaType: donation.mediaType ?? undefined,
    mediaApproved,
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
