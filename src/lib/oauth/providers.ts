/**
 * Registro genérico de providers OAuth2 (F10) — Discord/Twitch/Twitter/Kick.
 * INERTE sem client id/secret configurado: isConfigured() controla se o botão
 * "Conectar" aparece habilitado. Todos usam Authorization Code (sem PKCE por
 * simplicidade — client secret confidencial no server cobre a maioria dos casos;
 * Twitter recomenda PKCE mas aceita client secret também).
 */

export type OAuthProviderId = "DISCORD" | "TWITCH" | "TWITTER" | "KICK";

export interface OAuthUserInfo {
  providerUserId: string;
  username: string | null;
}

export interface OAuthProviderConfig {
  id: OAuthProviderId;
  label: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  userInfoUrl: string;
  parseUserInfo: (data: unknown) => OAuthUserInfo;
}

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProviderConfig> = {
  DISCORD: {
    id: "DISCORD",
    label: "Discord",
    clientIdEnv: "DISCORD_OAUTH_CLIENT_ID",
    clientSecretEnv: "DISCORD_OAUTH_CLIENT_SECRET",
    authorizeUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify",
    userInfoUrl: "https://discord.com/api/users/@me",
    parseUserInfo: (data) => {
      const d = data as { id: string; username?: string };
      return { providerUserId: d.id, username: d.username ?? null };
    },
  },
  TWITCH: {
    id: "TWITCH",
    label: "Twitch",
    clientIdEnv: "TWITCH_OAUTH_CLIENT_ID",
    clientSecretEnv: "TWITCH_OAUTH_CLIENT_SECRET",
    authorizeUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    scope: "user:read:email",
    userInfoUrl: "https://api.twitch.tv/helix/users",
    parseUserInfo: (data) => {
      const d = data as { data?: { id: string; login?: string }[] };
      const user = d.data?.[0];
      return { providerUserId: user?.id ?? "", username: user?.login ?? null };
    },
  },
  TWITTER: {
    id: "TWITTER",
    label: "Twitter/X",
    clientIdEnv: "TWITTER_OAUTH_CLIENT_ID",
    clientSecretEnv: "TWITTER_OAUTH_CLIENT_SECRET",
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "users.read tweet.read",
    userInfoUrl: "https://api.twitter.com/2/users/me",
    parseUserInfo: (data) => {
      const d = data as { data?: { id: string; username?: string } };
      return { providerUserId: d.data?.id ?? "", username: d.data?.username ?? null };
    },
  },
  KICK: {
    id: "KICK",
    label: "Kick",
    clientIdEnv: "KICK_OAUTH_CLIENT_ID",
    clientSecretEnv: "KICK_OAUTH_CLIENT_SECRET",
    authorizeUrl: "https://id.kick.com/oauth/authorize",
    tokenUrl: "https://id.kick.com/oauth/token",
    scope: "user:read",
    userInfoUrl: "https://api.kick.com/public/v1/users",
    parseUserInfo: (data) => {
      const d = data as { data?: { user_id: number; name?: string }[] };
      const user = d.data?.[0];
      return { providerUserId: String(user?.user_id ?? ""), username: user?.name ?? null };
    },
  },
};

export function isOAuthProviderConfigured(providerId: OAuthProviderId): boolean {
  const config = OAUTH_PROVIDERS[providerId];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  return Boolean(
    clientId &&
      clientId.trim() &&
      !clientId.includes("placeholder") &&
      clientSecret &&
      clientSecret.trim() &&
      !clientSecret.includes("placeholder")
  );
}
