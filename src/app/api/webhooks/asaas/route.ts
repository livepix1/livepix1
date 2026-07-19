import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postEntry, postEntries } from "@/lib/ledger";
import { toNumber } from "@/lib/serialize";
import { computePlatformFee } from "@/lib/fee";
import { broadcastToWidget } from "@/lib/realtime";

/** Palavrões básicos PT-BR — mensagem flagrada não vai pro TTS/tela. */
const BANNED_WORDS =
  /\b(porra|caralho|puta|merda|foder|fodase|foda-se|buceta|cu|viado|arrombado|desgra[çc]a)\b/i;

/** Processa doação paga: status + ledger (bruto - taxa) + meta + alerta + broadcast. */
async function handleDonationPaid(donationId: string, providerId?: string | null) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation || donation.status === "PAID") return;

  const amount = toNumber(donation.amount);
  const { fee, net } = computePlatformFee(amount, donation.method === "CARD" ? "CARD" : "PIX");
  const flagged = donation.message ? BANNED_WORDS.test(donation.message) : false;

  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      providerId: donation.providerId ?? providerId ?? null,
      moderationStatus: flagged ? "FLAGGED" : "AUTO_OK",
    },
  });

  // Ledger: crédito bruto + débito da taxa, atomicamente e idempotente.
  await postEntries(donation.creatorId, [
    {
      type: "DONATION_IN",
      amount,
      refType: "Donation",
      refId: donation.id,
      providerEventId: `donation-paid:${donation.id}`,
      description: `Doação de ${donation.payerName}`,
    },
    {
      type: "FEE",
      amount: -fee,
      refType: "Donation",
      refId: donation.id,
      providerEventId: `donation-fee:${donation.id}`,
      description: `Taxa da plataforma (${donation.method === "CARD" ? "cartão" : "PIX"})`,
    },
  ]);

  // Meta e campanha (best-effort, não bloqueia).
  if (donation.goalId) {
    await prisma.goal
      .update({
        where: { id: donation.goalId },
        data: { currentAmount: { increment: donation.amount } },
      })
      .catch(() => {});
  }
  if (donation.campaignId) {
    await prisma.campaign
      .update({
        where: { id: donation.campaignId },
        data: { raisedAmount: { increment: donation.amount } },
      })
      .catch(() => {});
  }

  // Fila de alerta (fonte de verdade) + broadcast (empurrão, best-effort).
  const existing = await prisma.alertEvent.findFirst({
    where: { donationId: donation.id },
    select: { id: true },
  });
  if (!existing) {
    const alertPayload = {
      payerName: updated.payerName,
      amount: net,
      grossAmount: amount,
      message: flagged ? null : updated.message,
      flagged,
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
}

/**
 * Recebe webhooks do Asaas e atualiza o status de cobranças/saques.
 * Fail-closed: se ASAAS_WEBHOOK_SECRET estiver definido, exige o token no header.
 * Idempotente: só grava quando há mudança real de estado.
 */
export async function POST(req: Request) {
  const secret = process.env.ASAAS_WEBHOOK_SECRET;
  const token = req.headers.get("asaas-access-token");

  // Se o segredo está configurado, ele é obrigatório e deve bater.
  if (secret && secret.trim() && !secret.includes("placeholder")) {
    if (token !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const payload = (await req.json().catch(() => null)) as {
    event?: string;
    payment?: { id?: string; externalReference?: string; status?: string };
    transfer?: { id?: string; status?: string };
  } | null;

  if (!payload?.event) {
    return NextResponse.json({ received: true });
  }

  try {
    // Eventos de cobrança
    if (payload.event.startsWith("PAYMENT_") && payload.payment) {
      const { id, externalReference, status } = payload.payment;
      const paid =
        payload.event === "PAYMENT_RECEIVED" ||
        payload.event === "PAYMENT_CONFIRMED" ||
        status === "RECEIVED" ||
        status === "CONFIRMED";
      const newStatus = paid
        ? "PAID"
        : payload.event === "PAYMENT_OVERDUE" ||
            payload.event === "PAYMENT_DELETED" ||
            payload.event === "PAYMENT_REFUNDED"
          ? "FAILED"
          : null;

      // Doações do modo criador usam externalReference "donation:{id}".
      if (externalReference?.startsWith("donation:")) {
        const donationId = externalReference.slice("donation:".length);
        if (newStatus === "PAID") {
          await handleDonationPaid(donationId, id);
        } else if (newStatus === "FAILED") {
          await prisma.donation
            .updateMany({
              where: { id: donationId, status: "PENDING" },
              data: { status: "EXPIRED" },
            })
            .catch(() => {});
        }
        return NextResponse.json({ received: true });
      }

      if (newStatus) {
        const charge = externalReference
          ? await prisma.charge.findUnique({ where: { id: externalReference } })
          : id
            ? await prisma.charge.findFirst({ where: { asaasChargeId: id } })
            : null;

        if (charge && charge.status !== newStatus) {
          await prisma.charge.update({
            where: { id: charge.id },
            data: {
              status: newStatus,
              paidAt: newStatus === "PAID" ? new Date() : charge.paidAt,
              asaasChargeId: charge.asaasChargeId ?? id ?? null,
            },
          });

          // Ledger: crédito idempotente quando pago (modo autônomo).
          if (newStatus === "PAID") {
            await postEntry({
              userId: charge.userId,
              type: "CHARGE_IN",
              amount: toNumber(charge.amount),
              refType: "Charge",
              refId: charge.id,
              providerEventId: `charge-paid:${charge.id}`,
              description: `Cobrança paga por ${charge.payerName}`,
            });
          }
        }
      }
    }

    // Eventos de transferência (saque)
    if (payload.event.startsWith("TRANSFER_") && payload.transfer?.id) {
      const done = payload.event === "TRANSFER_DONE";
      const failed =
        payload.event === "TRANSFER_FAILED" ||
        payload.event === "TRANSFER_CANCELLED";
      const newStatus = done ? "COMPLETED" : failed ? "FAILED" : null;

      if (newStatus) {
        const w = await prisma.withdrawal.findFirst({
          where: { asaasTransferId: payload.transfer.id },
        });
        if (w && w.status !== newStatus) {
          await prisma.withdrawal.update({
            where: { id: w.id },
            data: {
              status: newStatus,
              completedAt: newStatus === "COMPLETED" ? new Date() : w.completedAt,
            },
          });

          // Ledger: saque falhou → devolve o valor reservado (idempotente).
          if (newStatus === "FAILED") {
            await postEntry({
              userId: w.userId,
              type: "ADJUSTMENT",
              amount: toNumber(w.amount),
              refType: "Withdrawal",
              refId: w.id,
              providerEventId: `withdrawal-refund:${w.id}`,
              description: "Estorno de saque falho",
            });
          }
        }
      }
    }
  } catch {
    // Nunca devolver 500 pro Asaas por erro interno de gravação — evita retries em loop.
    return NextResponse.json({ received: true, processed: false });
  }

  return NextResponse.json({ received: true });
}
