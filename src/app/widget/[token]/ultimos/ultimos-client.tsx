"use client";

/**
 * Widget de últimos incentivos (OBS Browser Source).
 * Busca a rota /api/widget/[token]/recent a cada 15s e mostra lista vertical
 * combinando doações e assinaturas mais recentes.
 */

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";

interface RecentItem {
  type: "DONATION" | "SUBSCRIPTION";
  name: string;
  amount?: number;
  planName?: string;
  date: string;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function UltimosClient({ token }: { token: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  // Fundo transparente (OBS)
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/widget/${token}/recent`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { items: RecentItem[] };
        if (!cancelled) setItems(data.items);
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
  }, [token]);

  return (
    <div className="flex min-h-screen items-start justify-center bg-transparent p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-cyan-400/50 bg-[#0A0E27]/95 shadow-[0_0_40px_rgba(0,217,255,0.35)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <Gift size={18} className="text-cyan-300" />
          <p className="font-display text-base text-white">Últimos incentivos</p>
        </div>
        <div className="p-4">
          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">
              Ainda sem incentivos recentes.
            </p>
          ) : (
            <ol className="grid gap-2">
              {items.map((item, i) => (
                <li
                  key={item.type + item.name + item.date + i}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  <span className="truncate text-sm text-white/85">
                    <span className="text-cyan-300">{item.name}</span>{" "}
                    {item.type === "SUBSCRIPTION"
                      ? `assinou ${item.planName ?? "um plano"}`
                      : "doou"}
                  </span>
                  {item.type === "DONATION" && (
                    <span className="ml-2 shrink-0 text-sm font-medium text-pink-400">
                      {currencyFormatter.format(item.amount ?? 0)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
