import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OAUTH_PROVIDERS, type OAuthProviderId } from "@/lib/oauth/providers";
import { verifyOAuthState, exchangeCodeForUser } from "@/lib/oauth/flow";
import { encrypt } from "@/lib/crypto";

/** GET /api/oauth/{provider}/callback — troca o code, salva a conexão, volta pro dashboard. */
export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settingsUrl = new URL("/configuracoes/conexoes", req.url);

  if (!code || !state) {
    settingsUrl.searchParams.set("error", "missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  const userId = verifyOAuthState(state);
  if (!userId) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const providerId = params.provider.toUpperCase() as OAuthProviderId;
  const config = OAUTH_PROVIDERS[providerId];
  if (!config) {
    settingsUrl.searchParams.set("error", "unknown_provider");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = new URL(`/api/oauth/${params.provider}/callback`, req.url).toString();
    const { token, userInfo } = await exchangeCodeForUser(config, code, redirectUri);

    await prisma.socialConnection.upsert({
      where: { userId_provider: { userId, provider: providerId } },
      update: {
        providerUserId: userInfo.providerUserId,
        providerUsername: userInfo.username,
        accessTokenEnc: encrypt(token.accessToken),
        refreshTokenEnc: token.refreshToken ? encrypt(token.refreshToken) : null,
        expiresAt: token.expiresAt,
      },
      create: {
        userId,
        provider: providerId,
        providerUserId: userInfo.providerUserId,
        providerUsername: userInfo.username,
        accessTokenEnc: encrypt(token.accessToken),
        refreshTokenEnc: token.refreshToken ? encrypt(token.refreshToken) : null,
        expiresAt: token.expiresAt,
      },
    });

    settingsUrl.searchParams.set("connected", providerId);
    return NextResponse.redirect(settingsUrl);
  } catch {
    settingsUrl.searchParams.set("error", "exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }
}
