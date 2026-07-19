"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/serialize";

export interface GoalItem {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
}

/** Barra de progresso das metas, atualizada por polling (sem exigir reload). */
export function GoalsLive({ username, initial }: { username: string; initial: GoalItem[] }) {
  const [goals, setGoals] = useState(initial);

  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/creators/${username}/goals`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { goals: { id: string; currentAmount: number }[] };
        setGoals((prev) =>
          prev.map((g) => {
            const fresh = data.goals.find((f) => f.id === g.id);
            return fresh ? { ...g, currentAmount: fresh.currentAmount } : g;
          })
        );
      } catch {
        /* mantém o último valor conhecido */
      }
    };
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [username]);

  if (goals.length === 0) return null;

  return (
    <div className="grid gap-4">
      {goals.map((g) => {
        const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
        return (
          <div key={g.id}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-pixflow-slate">{g.title}</span>
              <span className="text-white/50">
                {formatBRL(g.currentAmount)} / {formatBRL(g.targetAmount)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pixflow-cyan to-pixflow-magenta transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-0.5 text-right text-xs text-pixflow-cyan">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}
