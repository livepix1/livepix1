"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/serialize";

/** Barra de progresso da campanha, atualizada por polling (mesmo padrão de GoalsLive). */
export function CampaignProgress({
  username,
  slug,
  targetAmount,
  initialRaised,
}: {
  username: string;
  slug: string;
  targetAmount: number | null;
  initialRaised: number;
}) {
  const [raised, setRaised] = useState(initialRaised);

  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/creators/${username}/campaigns/${slug}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { raisedAmount: number };
        setRaised(data.raisedAmount);
      } catch {
        /* mantém o último valor conhecido */
      }
    };
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [username, slug]);

  if (!targetAmount) {
    return <p className="text-2xl text-pixflow-cyan">{formatBRL(raised)} arrecadados</p>;
  }

  const pct = Math.min(100, Math.round((raised / targetAmount) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-pixflow-slate">{formatBRL(raised)}</span>
        <span className="text-white/50">meta: {formatBRL(targetAmount)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pixflow-cyan to-pixflow-magenta transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-pixflow-cyan">{pct}%</p>
    </div>
  );
}
