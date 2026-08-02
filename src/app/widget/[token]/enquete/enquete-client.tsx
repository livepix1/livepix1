"use client";

/**
 * Widget de enquete ao vivo (OBS Browser Source).
 * Busca a enquete ativa a cada 5s (mais rápido que os outros widgets — enquete
 * ao vivo precisa refletir voto em tempo quase real). Sem enquete ativa, o
 * componente renderiza null: overlay invisível no OBS, sem mensagem de erro.
 */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface PollOption {
  id: string;
  label: string;
  voteCount: number;
}

interface Poll {
  id: string;
  question: string;
  voteMode: string;
  options: PollOption[];
}

export function EnqueteClient({ token }: { token: string }) {
  const [poll, setPoll] = useState<Poll | null>(null);

  // Fundo transparente (OBS)
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch(`/api/widget/${token}/poll`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { poll: Poll | null };
        if (!cancelled) setPoll(data.poll);
      } catch {
        /* offline — tenta de novo no próximo tick */
      }
    }

    void sync();
    const interval = setInterval(sync, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  if (!poll) return null;

  const total = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
  const leaderId =
    total > 0
      ? poll.options.reduce((a, b) => (b.voteCount > a.voteCount ? b : a)).id
      : null;

  return (
    <div className="flex min-h-screen items-start justify-center bg-transparent p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-cyan-400/50 bg-[#0A0E27]/95 shadow-[0_0_40px_rgba(0,217,255,0.35)]">
        <div className="p-5">
          <p className="font-display text-lg text-white">{poll.question}</p>
          <div className="mt-4 grid gap-3">
            {poll.options.map((o) => {
              const pct = total > 0 ? Math.round((o.voteCount / total) * 100) : 0;
              const isLeader = leaderId === o.id && total > 0;
              return (
                <div key={o.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span
                      className={
                        isLeader
                          ? "flex items-center gap-1 text-cyan-300"
                          : "text-white/70"
                      }
                    >
                      {o.label}
                      {isLeader && <Check size={12} />}
                    </span>
                    <span className="text-white/50">{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-right text-xs text-white/40">{total} votos</p>
        </div>
      </div>
    </div>
  );
}
