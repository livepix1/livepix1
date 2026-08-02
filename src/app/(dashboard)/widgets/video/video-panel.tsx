"use client";

import { useState } from "react";
import { SkipForward, Pause, Play, Trash2, Video, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyLink } from "@/components/dashboard/CopyLink";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { removeMediaRequest, markMediaPlaying, clearMediaQueue } from "@/lib/actions/media-requests";

export interface MediaQueueItem {
  id: string;
  url: string;
  title: string | null;
  thumbnailUrl: string | null;
  requesterName: string;
  status: string;
  createdAt: string;
}

interface Props {
  widgetUrl: string;
  remoteBase: string;
  queue: MediaQueueItem[];
}

export function VideoPanel({ widgetUrl, remoteBase, queue }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setLoading(name);
    setMessage(null);
    setError(null);
    const res = await fn();
    setLoading(null);
    if (res.ok) setMessage(res.message ?? "Feito");
    else setError(res.error ?? "Erro");
  }

  return (
    <div className="grid gap-6">
      {(message || error) && (
        <p
          className={
            "rounded-xl border px-4 py-2.5 text-sm " +
            (message
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-pixflow-magenta/40 bg-pixflow-magenta/10 text-pixflow-magenta")
          }
        >
          {message ?? error}
        </p>
      )}

      {/* URL do widget */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="font-medium text-pixflow-slate">Widget de pedido de vídeo (OBS)</p>
        <p className="mt-1 text-xs text-white/40">
          No OBS: Fontes → + → Navegador → cole a URL (ex.: 800×450, proporção 16:9).
        </p>
        <CopyLink url={widgetUrl} />
      </div>

      {/* Controles da fila */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="mb-3 font-medium text-pixflow-slate">Fila de vídeos</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => run("clear", () => clearMediaQueue("VIDEO"))}
            disabled={loading === "clear"}
          >
            <Trash2 size={15} /> Limpar fila
          </Button>
        </div>
      </div>

      {/* Controle Remoto (StreamDeck) */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="font-medium text-pixflow-slate">Controle Remoto (StreamDeck)</p>
        <p className="mt-1 text-xs text-white/40">
          Cole cada link como uma ação &quot;Website&quot; no StreamDeck (ou qualquer
          automação que aceite abrir uma URL) pra controlar a fila sem abrir o painel.
        </p>
        <div className="mt-3 grid gap-2">
          {[
            { label: "Pular vídeo atual", icon: SkipForward, path: "skip" },
            { label: "Pausar fila", icon: Pause, path: "pause" },
            { label: "Retomar fila", icon: Play, path: "resume" },
            { label: "Limpar fila", icon: Trash2, path: "clear" },
          ].map((r) => (
            <div key={r.path}>
              <span className="mb-1 block text-xs text-white/50">{r.label}</span>
              <CopyLink url={`${remoteBase}/${r.path}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Fila atual */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="mb-3 font-medium text-pixflow-slate">Pedidos na fila</p>
        {queue.length === 0 ? (
          <EmptyState icon={Video} title="Nenhum pedido de vídeo ainda" />
        ) : (
          <div className="divide-y divide-white/5">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-pixflow-slate">
                    <span className="text-pixflow-cyan">{item.requesterName}</span>
                    {item.status === "PLAYING" && (
                      <span className="ml-2 rounded bg-emerald-500/20 px-1.5 text-xs text-emerald-400">
                        tocando
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-white/40">{item.title ?? item.url}</p>
                </div>
                <div className="flex flex-none gap-2">
                  {item.status !== "PLAYING" && (
                    <button
                      type="button"
                      onClick={() => run("play" + item.id, () => markMediaPlaying(item.id))}
                      className="flex items-center gap-1 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <PlayCircle size={13} /> Tocar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => run("remove" + item.id, () => removeMediaRequest(item.id))}
                    className="flex items-center gap-1 rounded-lg border border-pixflow-magenta/40 px-3 py-1.5 text-xs text-pixflow-magenta hover:bg-pixflow-magenta/10"
                  >
                    <Trash2 size={13} /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
