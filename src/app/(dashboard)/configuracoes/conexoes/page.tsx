import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { OAUTH_PROVIDERS, isOAuthProviderConfigured } from "@/lib/oauth/providers";
import { ConnectionsPanel, type ConnectionCard } from "./connections-panel";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Essa conexão ainda não está habilitada nesta conta.",
  missing_params: "Resposta inválida do provider. Tente conectar de novo.",
  invalid_state: "Sessão expirada durante a conexão. Tente de novo.",
  unknown_provider: "Provider desconhecido.",
  exchange_failed: "Não foi possível confirmar a conexão. Tente de novo.",
};

export default async function ConexoesPage({
  searchParams,
}: {
  searchParams: { error?: string; connected?: string };
}) {
  const user = await requireUser();
  const connections = await prisma.socialConnection.findMany({ where: { userId: user.id } });
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  const cards: ConnectionCard[] = Object.values(OAUTH_PROVIDERS).map((config) => ({
    provider: config.id,
    label: config.label,
    configured: isOAuthProviderConfigured(config.id),
    connected: byProvider.has(config.id)
      ? { username: byProvider.get(config.id)?.providerUsername ?? null }
      : null,
  }));

  return (
    <>
      <PageHeader
        title="Conexões"
        subtitle="Conecte suas redes pra automatizar recompensas e integrações futuras."
      />
      <div className="max-w-3xl">
        <ConnectionsPanel
          cards={cards}
          errorMessage={searchParams.error ? ERROR_MESSAGES[searchParams.error] ?? "Erro desconhecido" : null}
        />
      </div>
    </>
  );
}
