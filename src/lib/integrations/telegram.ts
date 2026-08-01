/**
 * Recompensas automáticas via bot do Telegram (F4b).
 * INERTE sem TELEGRAM_BOT_TOKEN — funções retornam sem efeito.
 *
 * Telegram não permite "adicionar" um usuário a um grupo por ID diretamente (só
 * o próprio usuário pode entrar). Por isso o padrão aqui é: no ACTIVE, gera um
 * link de convite de uso único (createInviteLink) que o assinante recebe e
 * clica; no CANCELED, remove do grupo com o padrão ban+unban imediato
 * ("kick" — remove agora, permite reentrar no futuro se assinar de novo).
 *
 * Setup fora do escopo desta sessão: criar o bot com @BotFather, adicionar o
 * bot ao grupo/canal do criador como admin com permissão de convidar/remover
 * membros, guardar TELEGRAM_BOT_TOKEN.
 */

const API_BASE = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return Boolean(token && token.trim() && !token.includes("placeholder"));
}

async function telegramFetch<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  if (!isTelegramConfigured()) return null;
  try {
    const res = await fetch(`${API_BASE}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { ok: boolean; result?: T } | null;
    if (!data?.ok) return null;
    return data.result ?? null;
  } catch {
    return null;
  }
}

/** Gera um link de convite de uso único (expira em 24h) pro grupo/canal do plano. */
export async function createInviteLink(chatId: string): Promise<string | null> {
  const result = await telegramFetch<{ invite_link: string }>("createChatInviteLink", {
    chat_id: chatId,
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  });
  return result?.invite_link ?? null;
}

/** Remove o membro do grupo (ban imediato + unban, pra permitir reentrar depois). */
export async function kickMember(chatId: string, userId: string): Promise<boolean> {
  const banned = await telegramFetch("banChatMember", { chat_id: chatId, user_id: userId });
  if (banned === null) return false;
  await telegramFetch("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true });
  return true;
}
