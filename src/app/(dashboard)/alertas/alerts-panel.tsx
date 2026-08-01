"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { CopyLink } from "@/components/dashboard/CopyLink";
import {
  saveAlertConfig,
  sendTestAlert,
  replayAlert,
  controlQueue,
} from "@/lib/actions/alerts";
import { regenerateWidgetToken } from "@/lib/actions/creator";

export interface RecentAlert {
  id: string;
  type: string;
  payerName: string;
  amount: number;
  message: string | null;
  createdAt: string;
  displayed: boolean;
}

interface Props {
  widgetUrl: string;
  qrUrl: string;
  remoteBase: string;
  paused: boolean;
  initial: {
    soundUrl: string;
    gifUrl: string;
    durationMs: string;
    ttsEnabled: boolean;
    ttsMinAmount: string;
    minAlertAmount: string;
  };
  recent: RecentAlert[];
}

export function AlertsPanel({ widgetUrl, qrUrl, remoteBase, paused, initial, recent }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setLoading(name);
    setMessage(null);
    setError(null);
    const res = await fn();
    setLoading(null);
    if (res.ok) setMessage(res.message ?? "Feito");
    else setError(res.error ?? "Erro");
  }

  async function onSaveConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await run("save", () =>
      saveAlertConfig({
        soundUrl: String(form.get("soundUrl") || ""),
        gifUrl: String(form.get("gifUrl") || ""),
        durationMs: String(form.get("durationMs") || "8000"),
        ttsEnabled: String(form.get("ttsEnabled")) === "true",
        ttsMinAmount: String(form.get("ttsMinAmount") || "0"),
        minAlertAmount: String(form.get("minAlertAmount") || "0"),
      })
    );
  }

  return (
    <div className="grid gap-6">
      {(message || error) && (
        <p
          className={
            "rounded-xl border px-4 py-2.5 text-sm " +
            (message
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-pixflow-magenta/40 bg-pixflow-magenta/10 text-pixflow-magenta")
          }
        >
          {message ?? error}
        </p>
      )}

      {/* URL do widget */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="font-medium text-pixflow-slate">Widget de alertas (OBS)</p>
        <p className="mt-1 text-xs text-white/40">
          No OBS: Fontes → + → Navegador → cole a URL (800×600).
        </p>
        <CopyLink url={widgetUrl} />
        <p className="mt-3 text-xs text-white/40">Overlay de QR fixo (opcional):</p>
        <CopyLink url={qrUrl} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => run("test", sendTestAlert)}
            disabled={loading === "test"}
          >
            {loading === "test" ? "Enviando..." : "🔔 Testar alerta"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => run("regen", regenerateWidgetToken)}
            disabled={loading === "regen"}
          >
            Regenerar token
          </Button>
        </div>
      </div>

      {/* Controles da fila */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="mb-3 font-medium text-pixflow-slate">Fila de alertas</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => run("skip", () => controlQueue("skip"))}>
            ⏭ Pular atual
          </Button>
          {paused ? (
            <Button variant="outline" onClick={() => run("resume", () => controlQueue("resume"))}>
              ▶ Retomar fila
            </Button>
          ) : (
            <Button variant="outline" onClick={() => run("pause", () => controlQueue("pause"))}>
              ⏸ Pausar fila
            </Button>
          )}
          <Button variant="ghost" onClick={() => run("clear", () => controlQueue("clear"))}>
            🗑 Limpar pendentes
          </Button>
        </div>
      </div>

      {/* Controle Remoto (StreamDeck) */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="font-medium text-pixflow-slate">Controle Remoto (StreamDeck)</p>
        <p className="mt-1 text-xs text-white/40">
          Cole cada link como uma ação &quot;Website&quot; no StreamDeck (ou qualquer
          automação que aceite abrir uma URL) pra controlar a fila sem abrir o painel.
        </p>
        <div className="mt-3 grid gap-2">
          {[
            { label: "Pular alerta atual", path: "skip" },
            { label: "Pausar fila", path: "pause" },
            { label: "Retomar fila", path: "resume" },
            { label: "Reexibir último alerta", path: "replay" },
          ].map((r) => (
            <div key={r.path}>
              <span className="mb-1 block text-xs text-white/50">{r.label}</span>
              <CopyLink url={`${remoteBase}/${r.path}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Configuração do alerta */}
      <form
        onSubmit={onSaveConfig}
        className="grid gap-4 rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
      >
        <p className="font-medium text-pixflow-slate">Aparência e comportamento</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Som do alerta (URL de áudio)" hint="mp3/wav — opcional">
            <Input name="soundUrl" defaultValue={initial.soundUrl} placeholder="https://.../som.mp3" />
          </Field>
          <Field label="GIF/imagem do alerta (URL)" hint="Opcional">
            <Input name="gifUrl" defaultValue={initial.gifUrl} placeholder="https://.../alerta.gif" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Duração (ms)">
            <Input name="durationMs" type="number" min="3000" max="30000" step="500" defaultValue={initial.durationMs} />
          </Field>
          <Field label="Ler mensagem em voz (TTS)">
            <Select name="ttsEnabled" defaultValue={String(initial.ttsEnabled)}>
              <option value="true">Ativado</option>
              <option value="false">Desativado</option>
            </Select>
          </Field>
          <Field label="TTS a partir de (R$)">
            <Input name="ttsMinAmount" type="number" min="0" step="0.01" defaultValue={initial.ttsMinAmount} />
          </Field>
        </div>

        <Field label="Alerta a partir de (R$)" hint="Doações abaixo disso não geram alerta na tela">
          <Input name="minAlertAmount" type="number" min="0" step="0.01" defaultValue={initial.minAlertAmount} />
        </Field>

        <div>
          <Button type="submit" disabled={loading === "save"}>
            {loading === "save" ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      </form>

      {/* Últimos alertas */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="mb-3 font-medium text-pixflow-slate">Últimos alertas</p>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/40">Nenhum alerta ainda.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-pixflow-slate">
                    <span className="text-pixflow-cyan">{a.payerName}</span>
                    {" · R$ "}
                    {a.amount.toFixed(2)}
                    {a.type === "TEST" && (
                      <span className="ml-2 rounded bg-white/10 px-1.5 text-xs text-white/50">teste</span>
                    )}
                  </p>
                  {a.message && (
                    <p className="truncate text-xs text-white/40">{a.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => run("replay" + a.id, () => replayAlert(a.id))}
                  className="flex-none rounded-lg border border-pixflow-cyan/40 px-3 py-1.5 text-xs text-pixflow-slate hover:border-pixflow-cyan hover:bg-pixflow-cyan/10"
                >
                  🔁 Replay
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
