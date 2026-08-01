/**
 * Fluxo OAuth2 Authorization Code genérico, parametrizado por provider
 * (src/lib/oauth/providers.ts). State assinado com HMAC (NEXTAUTH_SECRET) em
 * vez de guardado no banco — sem estado extra pra limpar, expira em 10 min.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { OAuthProviderConfig, OAuthUserInfo } from "./providers";

const STATE_TTL_MS = 10 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "dev-fallback")
    .update(payload)
    .digest("hex");
}

/** Gera um state assinado: {userId}:{timestamp}:{hmac}. */
export function createOAuthState(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  return `${payload}:${sign(payload)}`;
}

/** Valida o state e retorna o userId, ou null se inválido/expirado/adulterado. */
export function verifyOAuthState(state: string): string | null {
  const parts = state.split(":");
  if (parts.length !== 3) return null;
  const [userId, timestamp, signature] = parts;
  const payload = `${userId}:${timestamp}`;
  const expected = sign(payload);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (Date.now() - Number(timestamp) > STATE_TTL_MS) return null;
  return userId;
}

export function buildAuthorizeUrl(config: OAuthProviderConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env[config.clientIdEnv] as string,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
  });
  return `${config.authorizeUrl}?${params.toString()}`;
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

/** Troca o code pelo access token e busca as infos básicas do usuário no provider. */
export async function exchangeCodeForUser(
  config: OAuthProviderConfig,
  code: string,
  redirectUri: string
): Promise<{ token: TokenResult; userInfo: OAuthUserInfo }> {
  const tokenRes = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[config.clientIdEnv] as string,
      client_secret: process.env[config.clientSecretEnv] as string,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Falha ao trocar o código com ${config.label} (${tokenRes.status})`);
  }
  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const userRes = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      ...(config.id === "TWITCH" ? { "Client-Id": process.env[config.clientIdEnv] as string } : {}),
    },
  });
  if (!userRes.ok) {
    throw new Error(`Falha ao buscar usuário do ${config.label} (${userRes.status})`);
  }
  const userData = await userRes.json();

  return {
    token: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
    },
    userInfo: config.parseUserInfo(userData),
  };
}
