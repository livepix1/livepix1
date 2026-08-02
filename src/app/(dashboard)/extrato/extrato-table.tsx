"use client";

import { ExternalLink } from "lucide-react";
import { formatBRL } from "@/lib/serialize";

export interface LedgerRow {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  refType: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  DONATION_IN: "Doação recebida",
  CHARGE_IN: "Cobrança recebida",
  SUB_IN: "Assinatura recebida",
  FEE: "Taxa da plataforma",
  PAYOUT: "Saque",
  ADJUSTMENT: "Ajuste/estorno",
};

function toCsv(rows: LedgerRow[]): string {
  const header = ["Data", "Tipo", "Descrição", "Valor", "Comprovante"];
  const lines = rows.map((r) =>
    [
      new Date(r.createdAt).toLocaleString("pt-BR"),
      TYPE_LABEL[r.type] ?? r.type,
      (r.description ?? "").replace(/"/g, "'"),
      r.amount.toFixed(2).replace(".", ","),
      r.receiptUrl ?? "",
    ]
      .map((v) => `"${v}"`)
      .join(",")
  );
  return [header.map((h) => `"${h}"`).join(","), ...lines].join("\n");
}

export function ExtratoTable({ rows }: { rows: LedgerRow[] }) {
  function downloadCsv() {
    const csv = toCsv(rows);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato-pixlive-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="rounded-lg border border-pixflow-cyan/40 px-4 py-2 text-sm text-pixflow-slate hover:border-pixflow-cyan hover:bg-pixflow-cyan/10 disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/40">
          Nenhuma movimentação ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-white/40">
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 font-medium">Descrição</th>
                <th className="pb-3 font-medium">Valor</th>
                <th className="pb-3 font-medium">Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={"border-t border-white/5 " + (i % 2 === 1 ? "bg-white/[0.015]" : "")}
                >
                  <td className="py-3 text-white/60">
                    {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        (r.amount >= 0
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-pixflow-magenta/15 text-pixflow-magenta")
                      }
                    >
                      {TYPE_LABEL[r.type] ?? r.type}
                    </span>
                  </td>
                  <td className="py-3 text-white/60">{r.description ?? "—"}</td>
                  <td
                    className={
                      "py-3 font-medium " +
                      (r.amount >= 0 ? "text-emerald-400" : "text-pixflow-magenta")
                    }
                  >
                    {r.amount >= 0 ? "+" : ""}
                    {formatBRL(r.amount)}
                  </td>
                  <td className="py-3">
                    {r.receiptUrl ? (
                      <a
                        href={r.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-pixflow-cyan hover:text-pixflow-magenta"
                      >
                        Ver comprovante <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-white/30">—</span>
                    )}
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
