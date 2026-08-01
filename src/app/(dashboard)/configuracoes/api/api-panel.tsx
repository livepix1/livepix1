"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  createApiKey,
  revokeApiKey,
  createWebhook,
  toggleWebhook,
  deleteWebhook,
} from "@/lib/actions/api-keys";

export interface ApiKeyRow {
  id: string;
  name: string;
  scopes: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface WebhookRow {
  id: string;
  url: string;
  events: string;
  isActive: boolean;
}

const SCOPE_OPTIONS = [
  { value: "read", label: "Leitura (doações)" },
  { value: "alerts", label: "Controle de alertas" },
  { value: "write", label: "Escrita (inclui os outros)" },
];

const EVENT_OPTIONS = [
  { value: "payment.new", label: "Novo pagamento" },
  { value: "alert.new", label: "Novo alerta" },
];

export function ApiPanel({ keys, webhooks }: { keys: ApiKeyRow[]; webhooks: WebhookRow[] }) {
  const router = useRouter();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read"]);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["payment.new"]);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }
  function toggleEvent(ev: string) {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  }

  async function onCreateKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setKeyError(null);
    setLoading(true);
    const res = await createApiKey({ name: keyName, scopes: selectedScopes });
    setLoading(false);
    if (!res.ok) {
      setKeyError(res.error);
      return;
    }
    setNewKey(res.rawKey);
    setKeyName("");
    router.refresh();
  }

  async function onCreateWebhook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWebhookError(null);
    setLoading(true);
    const res = await createWebhook({ url: webhookUrl, events: selectedEvents });
    setLoading(false);
    if (!res.ok) {
      setWebhookError(res.error);
      return;
    }
    setWebhookUrl("");
    router.refresh();
  }

  return (
    <div className="grid gap-8">
      {/* API Keys */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="mb-1 font-medium text-pixflow-slate">API Keys</p>
        <p className="mb-4 text-xs text-white/40">
          Use no header <code className="text-pixflow-cyan">Authorization: Bearer &lt;chave&gt;</code>{" "}
          contra <code className="text-pixflow-cyan">/api/v1/*</code>.
        </p>

        {newKey && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-400">
              Copie sua chave agora — ela não será mostrada de novo:
            </p>
            <code className="mt-2 block break-all rounded-lg bg-pixflow-dark px-3 py-2 text-xs text-pixflow-cyan">
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => setNewKey(null)}
              className="mt-2 text-xs text-white/50 hover:text-white"
            >
              Já copiei, fechar
            </button>
          </div>
        )}

        <form onSubmit={onCreateKey} className="grid gap-3">
          {keyError && <p className="text-xs text-pixflow-magenta">{keyError}</p>}
          <Field label="Nome da chave">
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Integração com meu bot"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            {SCOPE_OPTIONS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(s.value)}
                  onChange={() => toggleScope(s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
          <div>
            <Button type="submit" disabled={loading || !keyName || selectedScopes.length === 0}>
              {loading ? "Criando..." : "Criar chave"}
            </Button>
          </div>
        </form>

        <div className="mt-4 grid gap-2">
          {keys.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">Nenhuma chave criada.</p>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-pixflow-dark px-3 py-2"
              >
                <div>
                  <p className="text-sm text-pixflow-slate">{k.name}</p>
                  <p className="text-xs text-white/40">escopos: {k.scopes}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await revokeApiKey(k.id);
                    router.refresh();
                  }}
                  className="text-xs text-white/40 hover:text-pixflow-magenta"
                >
                  Revogar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Webhooks */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="mb-1 font-medium text-pixflow-slate">Webhooks de saída</p>
        <p className="mb-4 text-xs text-white/40">
          Recebem POST assinado (header{" "}
          <code className="text-pixflow-cyan">X-PixLive-Signature</code>, HMAC-SHA256 com o
          secret do webhook).
        </p>

        <form onSubmit={onCreateWebhook} className="grid gap-3">
          {webhookError && <p className="text-xs text-pixflow-magenta">{webhookError}</p>}
          <Field label="URL de destino">
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://seusite.com/webhooks/pixlive"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            {EVENT_OPTIONS.map((ev) => (
              <label key={ev.value} className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(ev.value)}
                  onChange={() => toggleEvent(ev.value)}
                />
                {ev.label}
              </label>
            ))}
          </div>
          <div>
            <Button type="submit" disabled={loading || !webhookUrl || selectedEvents.length === 0}>
              {loading ? "Criando..." : "Criar webhook"}
            </Button>
          </div>
        </form>

        <div className="mt-4 grid gap-2">
          {webhooks.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">Nenhum webhook criado.</p>
          ) : (
            webhooks.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-pixflow-dark px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-pixflow-slate">{w.url}</p>
                  <p className="text-xs text-white/40">{w.events}</p>
                </div>
                <div className="flex flex-none gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await toggleWebhook(w.id, !w.isActive);
                      router.refresh();
                    }}
                    className="text-xs text-pixflow-cyan hover:text-pixflow-magenta"
                  >
                    {w.isActive ? "Pausar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteWebhook(w.id);
                      router.refresh();
                    }}
                    className="text-xs text-white/40 hover:text-pixflow-magenta"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
