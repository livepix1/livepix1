/**
 * Autenticação da API pública v1 (F8) — Bearer token com escopos.
 * A chave nunca é guardada em claro: só o SHA-256 dela (keyHash). Comparar por
 * hash é suficiente aqui (não precisa reversibilidade como a apiKey do Asaas
 * em src/lib/crypto.ts — essa a gente só precisa RECONHECER, nunca reenviar).
 */

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type ApiScope = "read" | "write" | "alerts";

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Gera uma chave nova. Retorna a chave em claro (mostrar só uma vez) + o hash a persistir. */
export function generateApiKey(): { raw: string; hash: string } {
  const raw = `plive_${randomBytes(24).toString("hex")}`;
  return { raw, hash: hashKey(raw) };
}

/**
 * Valida o header Authorization: Bearer <key> contra o banco. Retorna o userId
 * dono da chave se válida e com o escopo exigido, ou null caso contrário.
 * Atualiza lastUsedAt em background (não bloqueia a resposta).
 */
export async function authenticateApiKey(
  req: Request,
  requiredScope: ApiScope
): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const hash = hashKey(match[1].trim());
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!key) return null;

  // "write" é superset: uma chave com escopo write também vale pra read/alerts.
  const scopes = key.scopes.split(",").map((s) => s.trim());
  const authorized = scopes.includes(requiredScope) || scopes.includes("write");
  if (!authorized) return null;

  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return key.userId;
}
