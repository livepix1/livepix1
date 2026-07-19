/**
 * Publicação server-side no Supabase Realtime (Broadcast) — o "empurrão" dos alertas.
 * A FONTE DE VERDADE é o AlertEvent no Postgres; se este broadcast falhar, o widget
 * recupera pelos pendentes (/api/widget/[token]/pending). Por isso: best-effort,
 * nunca lança erro pro chamador.
 * INERTE sem NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

interface BroadcastMessage {
  type: "alert" | "control";
  [key: string]: unknown;
}

export function isRealtimeConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

/** Publica no canal `widget:{token}` via REST do Realtime. Nunca lança. */
export async function broadcastToWidget(
  widgetToken: string,
  message: BroadcastMessage
): Promise<boolean> {
  if (!isRealtimeConfigured()) return false;
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `widget:${widgetToken}`,
            event: message.type,
            payload: message,
          },
        ],
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false; // best-effort — o widget drena pendentes de qualquer jeito
  }
}
