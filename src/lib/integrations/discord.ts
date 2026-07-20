/**
 * Recompensas automáticas via bot do Discord (F4b).
 * INERTE sem DISCORD_BOT_TOKEN — grant/revoke retornam sem efeito.
 *
 * Como isso liga de verdade (fora do escopo desta sessão):
 * 1. Criar um app/bot no Discord Developer Portal, convidar pro servidor do criador
 *    com permissão "Manage Roles", guardar DISCORD_BOT_TOKEN.
 * 2. O criador informa o `discordRoleId` (ID do cargo) e o assinante conecta a
 *    conta Discord (OAuth2 — não implementado aqui) pra sabermos o `discordUserId`.
 * 3. Um job periódico (Vercel Cron ou Supabase pg_cron — a Vercel Hobby só permite
 *    1 execução de cron por dia, o que já é suficiente pra sincronizar assinaturas)
 *    varre Subscriptions ACTIVE↔CANCELED e chama grantRole/revokeRole.
 */

export function isDiscordConfigured(): boolean {
  const token = process.env.DISCORD_BOT_TOKEN;
  return Boolean(token && token.trim() && !token.includes("placeholder"));
}

export async function grantRole(guildId: string, userId: string, roleId: string): Promise<boolean> {
  if (!isDiscordConfigured()) return false;
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    }
  );
  return res.ok;
}

export async function revokeRole(guildId: string, userId: string, roleId: string): Promise<boolean> {
  if (!isDiscordConfigured()) return false;
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    }
  );
  return res.ok;
}
