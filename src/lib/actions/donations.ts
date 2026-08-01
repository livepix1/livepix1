"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { donationSchema } from "@/lib/validators";
import { toNumber } from "@/lib/serialize";
import { getProvider, getCreatorSplit, ProviderNotConfiguredError } from "@/lib/payments";

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
