"use client";

/**
 * Widget de ranking (OBS Browser Source).
 * Lê o período da própria query string da URL do widget (?period=today|week|month|all,
 * default month) e re-busca a rota de ranking a cada 15s.
 */

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

interface RankingRow {
  payerName: string;
  total: number;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function RankingClient({ token }: { token: string }) {
  // Lê direto de window.location.search (em vez de useSearchParams) pra não exigir
  // Suspense boundary — este widget é 100% client, embutido como OBS Browser Source.
  const [period, setPeriod] = useState("month");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("period");
    if (value) setPeriod(value);
  }, []);
  const [ranking, setRanking] = useState<RankingRow[]>([]);

  // Fundo transparente (OBS)
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/widget/${token}/ranking?period=${encodeURIComponent(period)}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { ranking: RankingRow[] };
        if (!cancelled) setRanking(data.ranking);
      } catch {
        /* offline — tenta de novo no próximo tick */
      }
    }

    void load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, period]);

  return (
    <div className="flex min-h-screen items-start justify-center bg-transparent p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-cyan-400/50 bg-[#0A0E27]/95 shadow-[0_0_40px_rgba(0,217,255,0.35)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Trophy size={18} className="text-cyan-300" />
          <p className="font-display text-base text-white">Ranking de apoiadores</p>
        </div>
        <div className="p-4">
          {ranking.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">
              Ainda sem doações neste período.
            </p>
          ) : (
            <ol className="grid gap-2">
              {ranking.map((row, i) => (
                <li
                  key={row.payerName + i}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  <span className="flex items-center gap-2 truncate text-sm text-white/85">
                    <span className="font-display text-cyan-300">{i + 1}º</span>
                    <span className="truncate">{row.payerName}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-sm font-medium text-pink-400">
                    {currencyFormatter.format(row.total)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
