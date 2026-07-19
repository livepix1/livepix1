"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

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
