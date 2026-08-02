"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { computePlatformFee } from "@/lib/fee";
import { BANNED_WORDS } from "@/lib/moderation-words";
import { createAndBroadcastDonationAlert } from "@/lib/donation-alerts";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Aprova ou bloqueia uma doação flagrada pela moderação automática. */
export async function reviewDonation(
  donationId: string,
  decision: "AUTO_OK" | "BLOCKED"
): Promise<ActionResult> {
  const session = await requireSession();

  const donation = await prisma.donation.findFirst({
    where: { id: donationId, creatorId: session.user.id },
  });
  if (!donation) return { ok: false, error: "Doação não encontrada" };

  await prisma.donation.update({
    where: { id: donationId },
    data: { moderationStatus: decision },
  });

  revalidatePath("/moderacao");
  return { ok: true };
}

/**
 * Aprova ou bloqueia uma mensagem de áudio/vídeo anexada a uma doação
 * (PENDING_VOICE_REVIEW). Sem Whisper configurado, essa revisão é sempre
 * manual — nada toca automaticamente no widget até essa decisão.
 * Ao aprovar, dispara o alerta (que estava represado) pro widget agora sim.
 */
export async function reviewVoiceMessage(
  donationId: string,
  approve: boolean
): Promise<ActionResult> {
  const session = await requireSession();

  const donation = await prisma.donation.findFirst({
    where: {
      id: donationId,
      creatorId: session.user.id,
      moderationStatus: "PENDING_VOICE_REVIEW",
    },
  });
  if (!donation) {
    return { ok: false, error: "Doação não encontrada ou já revisada" };
  }

  await prisma.donation.update({
    where: { id: donationId },
    data: { moderationStatus: approve ? "AUTO_OK" : "BLOCKED" },
  });

  if (approve) {
    const amount = toNumber(donation.amount);
    const { net } = computePlatformFee(amount, donation.method === "CARD" ? "CARD" : "PIX");
    const flagged = donation.message ? BANNED_WORDS.test(donation.message) : false;
    await createAndBroadcastDonationAlert(donation, amount, net, flagged, true);
  }

  revalidatePath("/moderacao");
  return { ok: true };
}
