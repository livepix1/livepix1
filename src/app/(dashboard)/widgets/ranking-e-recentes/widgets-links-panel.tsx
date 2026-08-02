"use client";

import { useState } from "react";
import { Trophy, Gift } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Input";
import { CopyLink } from "@/components/dashboard/CopyLink";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Últimos 7 dias" },
  { value: "month", label: "Últimos 30 dias" },
  { value: "all", label: "Todo o período" },
] as const;

interface Props {
  rankingBaseUrl: string;
  ultimosUrl: string;
}

export function WidgetsLinksPanel({ rankingBaseUrl, ultimosUrl }: Props) {
  const [period, setPeriod] = useState<string>("month");
  const rankingUrl = `${rankingBaseUrl}?period=${period}`;

  return (
    <>
      <Card accent>
        <div className="mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-pixflow-cyan" />
          <p className="font-medium text-white">Ranking de apoiadores</p>
        </div>
        <p className="text-sm text-white/50">
          Mostra o top 10 doadores da transmissão no período escolhido. Copie o link e
          adicione no OBS como Browser Source (fundo transparente).
        </p>
        <div className="mt-4 max-w-xs">
          <Field label="Período">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <CopyLink url={rankingUrl} />
      </Card>

      <Card accent>
        <div className="mb-3 flex items-center gap-2">
          <Gift size={18} className="text-pixflow-cyan" />
          <p className="font-medium text-white">Últimos incentivos</p>
        </div>
        <p className="text-sm text-white/50">
          Lista as doações e assinaturas mais recentes recebidas. Copie o link e adicione
          no OBS como Browser Source (fundo transparente).
        </p>
        <CopyLink url={ultimosUrl} />
      </Card>
    </>
  );
}
