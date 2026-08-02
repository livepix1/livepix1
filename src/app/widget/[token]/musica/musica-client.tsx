"use client";

/**
 * Overlay de pedido de música (OBS Browser Source). Só visual — sem player
 * de áudio embutido, o criador toca a música manualmente noutro app (Spotify
 * etc). A fila vive no banco (MediaRequest) — polling a cada 10s.
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

export function MusicaWidgetClient({ token }: { token: string }) {
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  const sync = useCallback(async () => {
    try {
      const res = await fetch(`/api/widget/${token}/media/music`, { cache: "no-store" });
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

  return (
    <div className="min-h-screen bg-transparent p-4">
      {playing && (
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-cyan-400/50 bg-[#0A0E27]/95 shadow-[0_0_40px_rgba(0,217,255,0.35)]">
          <div className="p-5 text-center">
            <p className="font-display text-lg text-white">
              <span className="text-cyan-300">{playing.requesterName}</span> pediu uma música
            </p>
            <p className="mt-2 break-all text-sm text-white/85">
              {playing.title ?? playing.url}
            </p>
          </div>
        </div>
      )}

      {upNext.length > 0 && (
        <div className="mx-auto mt-3 w-full max-w-md rounded-xl border border-white/10 bg-[#0A0E27]/80 p-3">
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
