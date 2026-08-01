/**
 * Rate limit best-effort (janela deslizante simples via Postgres — sobrevive a
 * cold start/múltiplas instâncias, ao contrário de um Map em memória). Não é
 * atômico sob corrida pesada (upsert + update em duas etapas), mas é suficiente
 * pra mitigar abuso em rotas públicas — não é uma defesa contra DDoS distribuído.
 */

import { prisma } from "@/lib/prisma";

/**
 * Retorna true se a chave AINDA está dentro do limite (requisição permitida).
 * Cada chamada conta como uma tentativa.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = new Date();

  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  if (!existing || now.getTime() - existing.windowStart.getTime() > windowMs) {
    await prisma.rateLimit.upsert({
      where: { key },
      update: { count: 1, windowStart: now },
      create: { key, count: 1, windowStart: now },
    });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return true;
}
