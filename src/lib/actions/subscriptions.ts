"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/serialize";
import { getProvider, getCreatorSplit, ProviderNotConfiguredError } from "@/lib/payments";

const subscribeSchema = z.object({
  subscriberName: z.string().min(2, "Nome muito curto").max(60),
  subscriberEmail: z.string().email("Email inválido"),
});

export type SubscribeResult =
  | { ok: true; paymentUrl: string | null; subscriptionId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Assina um plano — cria a recorrência no provider e retorna o link de pagamento. */
export async function subscribeToPlan(planId: string, input: unknown): Promise<SubscribeResult> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  const plan = await prisma.creatorPlan.findFirst({
    where: { id: planId, isActive: true },
  });
  if (!plan) return { ok: false, error: "Plano não encontrado ou inativo" };

  const sub = await prisma.subscription.create({
    data: {
      planId: plan.id,
      subscriberName: parsed.data.subscriberName.trim(),
      subscriberEmail: parsed.data.subscriberEmail.trim(),
      status: "PENDING",
    },
  });

  try {
    const provider = getProvider();
    const split = await getCreatorSplit(plan.creatorId, "PIX");
    const result = await provider.createSubscription({
      customerName: parsed.data.subscriberName.trim(),
      customerEmail: parsed.data.subscriberEmail.trim(),
      value: toNumber(plan.price),
      description: `Assinatura: ${plan.name}`,
      externalReference: `subscription:${sub.id}`,
      cycle: "MONTHLY",
      ...split,
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { providerSubId: result.providerSubId },
    });

    return { ok: true, paymentUrl: result.paymentUrl ?? null, subscriptionId: sub.id };
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) {
      return {
        ok: false,
        error: "Assinaturas ainda não estão ativas nesta conta. Tente novamente em breve.",
      };
    }
    return { ok: false, error: "Erro ao criar a assinatura. Tente novamente." };
  }
}

/** Cancela uma assinatura pelo link mágico (sem exigir login do assinante). */
export async function cancelSubscriptionByToken(
  cancelToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sub = await prisma.subscription.findUnique({ where: { cancelToken } });
  if (!sub) return { ok: false, error: "Assinatura não encontrada" };
  if (sub.status === "CANCELED") return { ok: true };

  try {
    if (sub.providerSubId) {
      const provider = getProvider();
      await provider.cancelSubscription(sub.providerSubId);
    }
  } catch (err) {
    if (!(err instanceof ProviderNotConfiguredError)) {
      return { ok: false, error: "Erro ao cancelar no provedor de pagamento" };
    }
    // Sem provider configurado: cancela só localmente (ambiente de teste).
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED" },
  });
  return { ok: true };
}
