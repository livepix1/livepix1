"use client";

import { useState } from "react";
import { Check, X, Mic } from "lucide-react";
import { reviewVoiceMessage } from "@/lib/actions/moderation";
import { formatBRL } from "@/lib/serialize";
import { EmptyState } from "@/components/dashboard/EmptyState";

export interface PendingVoiceDonation {
  id: string;
  payerName: string;
  amount: number;
  message: string;
  mediaUrl: string;
  mediaType: "AUDIO" | "VIDEO";
  createdAt: string;
}

export function VoiceModerationList({ items }: { items: PendingVoiceDonation[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  async function decide(id: string, approve: boolean) {
    setLoading(id);
    await reviewVoiceMessage(id, approve);
    setLoading(null);
    setHidden((prev) => new Set(prev).add(id));
  }

  const visible = items.filter((i) => !hidden.has(i.id));

  if (visible.length === 0) {
    return <EmptyState icon={Mic} title="Nenhuma mensagem de áudio/vídeo pendente" />;
  }

  return (
    <div className="grid gap-3">
      {visible.map((d) => (
        <div
          key={d.id}
          className="rounded-xl border border-pixflow-cyan/30 bg-pixflow-cyan/5 p-4"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-pixflow-slate">
              {d.payerName} · {formatBRL(d.amount)}
            </span>
            <span className="text-xs text-white/40">
              {new Date(d.createdAt).toLocaleString("pt-BR")}
            </span>
          </div>
          {d.message && <p className="mt-2 text-sm text-white/70">{d.message}</p>}
          <div className="mt-3">
            {d.mediaType === "AUDIO" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={d.mediaUrl} className="h-10 w-full" />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video controls src={d.mediaUrl} className="max-h-64 w-full rounded-lg" />
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => decide(d.id, true)}
              disabled={loading === d.id}
              className="flex items-center gap-1 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
            >
              <Check size={13} /> Aprovar
            </button>
            <button
              type="button"
              onClick={() => decide(d.id, false)}
              disabled={loading === d.id}
              className="flex items-center gap-1 rounded-lg border border-pixflow-magenta/40 px-3 py-1.5 text-xs text-pixflow-magenta hover:bg-pixflow-magenta/10"
            >
              <X size={13} /> Bloquear
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
