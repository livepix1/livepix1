"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatBRL } from "@/lib/serialize";

export interface ChargeRow {
  id: string;
  payerName: string;
  payerEmail: string;
  amount: number;
  status: string;
  createdAt: string; // ISO
}

type RangeFilter = "7d" | "30d" | "all";

export function ChargesTable({ charges }: { charges: ChargeRow[] }) {
  const [range, setRange] = useState<RangeFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      range === "7d"
        ? now - 7 * 864e5
        : range === "30d"
          ? now - 30 * 864e5
          : 0;
    const q = query.trim().toLowerCase();
    return charges.filter((c) => {
      const inRange = cutoff === 0 || new Date(c.createdAt).getTime() >= cutoff;
      const inQuery =
        !q ||
        c.payerName.toLowerCase().includes(q) ||
        c.payerEmail.toLowerCase().includes(q);
      return inRange && inQuery;
    });
  }, [charges, range, query]);

  const ranges: { key: RangeFilter; label: string }[] = [
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "Mês" },
    { key: "all", label: "Tudo" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-white/10 p-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={
                "rounded-md px-3 py-1.5 text-sm transition-colors " +
                (range === r.key
                  ? "bg-pixflow-cyan/15 text-pixflow-cyan"
                  : "text-white/50 hover:text-pixflow-slate")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou email"
          className="w-full max-w-xs rounded-lg border border-white/10 bg-pixflow-dark px-3 py-2 text-sm text-pixflow-slate placeholder:text-white/30 focus:border-pixflow-cyan focus:outline-none sm:w-auto"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/40">
          Nenhuma cobrança encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-white/40">
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium">De quem</th>
                <th className="pb-3 font-medium">Valor</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className={
                    "border-t border-white/5 " +
                    (i % 2 === 1 ? "bg-white/[0.015]" : "")
                  }
                >
                  <td className="py-3 text-white/60">
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3">
                    <p className="text-pixflow-slate">{c.payerName}</p>
                    <p className="text-xs text-white/40">{c.payerEmail}</p>
                  </td>
                  <td className="py-3 text-pixflow-slate">{formatBRL(c.amount)}</td>
                  <td className="py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
