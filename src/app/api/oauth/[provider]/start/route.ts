import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OAUTH_PROVIDERS, isOAuthProviderConfigured, type OAuthProviderId } from "@/lib/oauth/providers";
import { createOAuthState, buildAuthorizeUrl } from "@/lib/oauth/flow";

/** GET /api/oauth/{provider}/start — inicia o fluxo, exige sessão (é o criador conectando a conta). */
export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const providerId = params.provider.toUpperCase() as OAuthProviderId;
  const config = OAUTH_PROVIDERS[providerId];
  if (!config) {
    return NextResponse.json({ error: "Provider desconhecido" }, { status: 404 });
  }
  if (!isOAuthProviderConfigured(providerId)) {
    return NextResponse.redirect(
      new URL("/configuracoes/conexoes?error=not_configured", req.url)
    );
  }

  const state = createOAuthState(session.user.id);
  const redirectUri = new URL(`/api/oauth/${params.provider}/callback`, req.url).toString();
  const authorizeUrl = buildAuthorizeUrl(config, redirectUri, state);

  return NextResponse.redirect(authorizeUrl);
}
