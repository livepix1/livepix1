import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDiscordConfigured, grantRole, revokeRole } from "@/lib/integrations/discord";
import { isTelegramConfigured, createInviteLink, kickMember } from "@/lib/integrations/telegram";

/**
 * Sincroniza recompensas Discord/Telegram com o status real da assinatura.
 * ACTIVE sem rewardGranted → concede (grant/link de convite) e marca granted.
 * CANCELED/PAST_DUE com rewardGranted → revoga (remove cargo/kick do grupo) e
 * desmarca. INERTE-safe: pula tudo se os bots não estiverem configurados.
 * Protegida por CRON_SECRET (mesmo padrão do /api/cron/reconcile).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && secret.trim()) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  if (!isDiscordConfigured() && !isTelegramConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Nenhum bot configurado" });
  }

  const toGrant = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      rewardGranted: false,
      OR: [{ discordUserId: { not: null } }, { telegramUserId: { not: null } }],
    },
    include: { plan: true },
  });

  const toRevoke = await prisma.subscription.findMany({
    where: {
      status: { in: ["CANCELED", "PAST_DUE"] },
      rewardGranted: true,
    },
    include: { plan: true },
  });

  let granted = 0;
  let revoked = 0;

  for (const sub of toGrant) {
    let didSomething = false;

    if (isDiscordConfigured() && sub.discordUserId && sub.plan.discordGuildId && sub.plan.discordRoleId) {
      const ok = await grantRole(sub.plan.discordGuildId, sub.discordUserId, sub.plan.discordRoleId);
      didSomething = didSomething || ok;
    }
    if (isTelegramConfigured() && sub.telegramUserId && sub.plan.telegramGroupId) {
      const link = await createInviteLink(sub.plan.telegramGroupId);
      didSomething = didSomething || Boolean(link);
      // O link em si não é entregue aqui (não temos canal de notificação assíncrono
      // além do e-mail, fora do escopo desta fase) — fica registrado como concedido
      // porque o acesso via convite foi habilitado do lado do Telegram.
    }

    if (didSomething) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { rewardGranted: true } });
      granted++;
    }
  }

  for (const sub of toRevoke) {
    let didSomething = false;

    if (isDiscordConfigured() && sub.discordUserId && sub.plan.discordGuildId && sub.plan.discordRoleId) {
      const ok = await revokeRole(sub.plan.discordGuildId, sub.discordUserId, sub.plan.discordRoleId);
      didSomething = didSomething || ok;
    }
    if (isTelegramConfigured() && sub.telegramUserId && sub.plan.telegramGroupId) {
      const ok = await kickMember(sub.plan.telegramGroupId, sub.telegramUserId);
      didSomething = didSomething || ok;
    }

    if (didSomething) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { rewardGranted: false } });
      revoked++;
    }
  }

  return NextResponse.json({ granted, revoked, checkedGrant: toGrant.length, checkedRevoke: toRevoke.length });
}
