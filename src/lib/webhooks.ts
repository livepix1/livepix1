/**
 * Webhooks de saída (F8) — best-effort, com 1 retry simples. Assinatura HMAC-SHA256
 * do corpo cru no header X-PixLive-Signature, pro destinatário validar autenticidade.
 */

import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

export type WebhookEvent = "payment.new" | "alert.new";

async function post(url: string, body: string, signature: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixLive-Signature": signature,
      },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Dispara o evento pra todos os webhooks ativos do usuário que escutam esse tipo. Nunca lança. */
export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId, isActive: true },
  });
  const targets = endpoints.filter((e) => e.events.split(",").includes(event));
  if (targets.length === 0) return;

  const body = JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() });

  await Promise.all(
    targets.map(async (endpoint) => {
      const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
      const ok = await post(endpoint.url, body, signature);
      if (!ok) {
        // 1 retry simples após falha — sem fila/backoff exponencial (fora do escopo desta fase).
        await post(endpoint.url, body, signature);
      }
    })
  ).catch(() => {});
}
