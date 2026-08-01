"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { disconnectProvider } from "@/lib/actions/connections";
import type { OAuthProviderId } from "@/lib/oauth/providers";

export interface ConnectionCard {
  provider: OAuthProviderId;
  label: string;
  configured: boolean;
  connected: { username: string | null } | null;
}

export function ConnectionsPanel({
  cards,
  errorMessage,
}: {
  cards: ConnectionCard[];
  errorMessage: string | null;
}) {
  const router = useRouter();

  return (
    <div className="grid gap-4">
      {errorMessage && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {errorMessage}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.provider}
            className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
          >
            <p className="font-medium text-pixflow-slate">{c.label}</p>
            {c.connected ? (
              <>
                <p className="mt-1 text-sm text-emerald-400">
                  Conectado{c.connected.username ? ` como @${c.connected.username}` : ""}
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={async () => {
                    await disconnectProvider(c.provider);
                    router.refresh();
                  }}
                >
                  Desconectar
                </Button>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/50">Não conectado</p>
                {c.configured ? (
                  <a href={`/api/oauth/${c.provider.toLowerCase()}/start`}>
                    <Button className="mt-3">Conectar</Button>
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-white/40">
                    Ainda não habilitado nesta conta (aguardando credenciais OAuth).
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
