/**
 * Envio de e-mail transacional (Resend) — padrão INERTE do projeto (mesma ideia de
 * src/lib/crypto.ts e src/lib/asaas-client.ts): sem RESEND_API_KEY configurada,
 * sendEmail() NUNCA lança erro e NUNCA derruba o fluxo — apenas retorna `false`,
 * e quem chamou decide o que fazer (ex.: mostrar o link de confirmação na tela).
 */

import { BRAND } from "@/lib/brand";

export function isEmailConfigured(): boolean {
  const raw = process.env.RESEND_API_KEY;
  return Boolean(raw && raw.trim() && !raw.includes("placeholder"));
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia um e-mail via API REST do Resend. Retorna `true` se enviado, `false` se
 * o provider não estiver configurado OU se a chamada falhar (loga o erro, não lança).
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${BRAND.name} <noreply@${BRAND.domain}>`,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error("[email] Resend respondeu com erro:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Falha ao enviar e-mail:", err);
    return false;
  }
}
