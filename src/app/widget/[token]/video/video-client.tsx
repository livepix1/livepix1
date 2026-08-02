"use client";

/**
 * Overlay de pedido de vídeo (OBS Browser Source). A fila vive no banco
 * (MediaRequest) — polling a cada 10s dreana tudo, sem depender de Realtime.
 * O criador controla a fila pelo painel (/widgets/video) ou pelo Controle
 * Remoto tipo StreamDeck (/api/remote/{token}/media/video/{action}).
 */

import { useCallback, useEffect, useState } from "react";

interface MediaItem {
  id: string;
  kind: string;
  url: string;
  title: string | null;
  thumbnailUrl: string | null;
  requesterName: string;
  status: string;
  createdAt: string;
}

/** Extrai o ID de um vídeo do YouTube de `watch?v=` ou `youtu.be/`. Null se não for YouTube. */
function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoWidgetClient({ token }: { token: string }) {
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  const sync = useCallback(async () => {
    try {
      const res = await fetch(`/api/widget/${token}/media/video`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: MediaItem[] };
      setItems(data.items);
    } catch {
      /* offline — tenta de novo no próximo tick */
    }
  }, [token]);

  useEffect(() => {
    void sync();
    const interval = setInterval(sync, 10000);
    return () => clearInterval(interval);
  }, [sync]);

  const playing = items.find((i) => i.status === "PLAYING");
  const upNext = items.filter((i) => i.status === "PENDING").slice(0, 5);
  const videoId = playing ? extractYoutubeId(playing.url) : null;

  return (
    <div className="min-h-screen bg-transparent p-4">
      {playing && videoId && (
        <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-cyan-400/50 shadow-[0_0_40px_rgba(0,217,255,0.35)]">
          <iframe
            key={playing.id}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={playing.title ?? "Vídeo pedido"}
            className="h-full w-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}
      {playing && !videoId && (
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-cyan-400/50 bg-[#0A0E27]/95 p-6 text-center text-white">
          <p className="text-sm text-white/70">
            Pedido de {playing.requesterName} — link não é do YouTube:
          </p>
          <p className="mt-1 break-all text-cyan-300">{playing.url}</p>
        </div>
      )}

      {upNext.length > 0 && (
        <div className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-white/10 bg-[#0A0E27]/80 p-3">
          <p className="mb-1.5 text-xs font-medium text-white/50">A seguir</p>
          <div className="flex flex-col gap-1">
            {upNext.map((i) => (
              <p key={i.id} className="truncate text-xs text-white/70">
                <span className="text-cyan-300">{i.requesterName}</span>
                {i.title ? ` — ${i.title}` : ` — ${i.url}`}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
