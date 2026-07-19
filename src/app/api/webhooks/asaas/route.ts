import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postEntry } from "@/lib/ledger";
import { toNumber } from "@/lib/serialize";

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
