"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { CopyLink } from "@/components/dashboard/CopyLink";
import {
  updateMarathonConfig,
  setMarathonActive,
  resetMarathonTimer,
} from "@/lib/actions/marathon";

interface Initial {
  isActive: boolean;
  secondsPerReal: number;
  maxSeconds: number | null;
  remainingSeconds: number;
}

function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function MaratonaPanel({ widgetUrl, initial }: { widgetUrl: string; initial: Initial }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(initial.isActive);

  // Painel atrás de tela de configuração — não precisa contar em tempo real
  // como o overlay, mas mantém o tempo restante razoavelmente fresco.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(interval);
  }, [router]);

  async function run(
    name: string,
    fn: () => Promise<{ ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> }>
  ) {
    setLoading(name);
    setMessage(null);
    setError(null);
    setFieldErrors({});
    const res = await fn();
    setLoading(null);
    if (res.ok) {
      setMessage(res.message ?? "Feito");
      router.refresh();
    } else {
      setError(res.error ?? "Erro");
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    }
  }

  async function onSaveConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await run("save", () =>
      updateMarathonConfig({
        secondsPerReal: String(form.get("secondsPerReal") || "60"),
        maxSeconds: String(form.get("maxSeconds") || ""),
      })
    );
  }

  async function onToggleActive() {
    const next = !isActive;
    setIsActive(next);
    await run("toggle", () => setMarathonActive(next));
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
        <p className="font-medium text-pixflow-slate">Widget de Maratona (OBS)</p>
        <p className="mt-1 text-xs text-white/40">
          No OBS: Fontes → + → Navegador → cole a URL (400×200, fundo transparente).
        </p>
        <CopyLink url={widgetUrl} />
      </div>

      {/* Cronômetro atual */}
      <div className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5">
        <p className="mb-3 font-medium text-pixflow-slate">Cronômetro</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-3xl tabular-nums text-pixflow-cyan">
              {formatHMS(initial.remainingSeconds)}
            </p>
            <span
              className={
                "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs " +
                (isActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/10 text-white/50")
              }
            >
              {isActive ? "Ativa" : "Pausada"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onToggleActive} disabled={loading === "toggle"}>
              {isActive ? <Pause size={15} /> : <Play size={15} />}
              {isActive ? "Pausar" : "Ativar"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => run("reset", resetMarathonTimer)}
              disabled={loading === "reset"}
            >
              <RotateCcw size={15} /> Resetar
            </Button>
          </div>
        </div>
      </div>

      {/* Configuração */}
      <form
        onSubmit={onSaveConfig}
        className="grid gap-4 rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
      >
        <p className="font-medium text-pixflow-slate">Configuração</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Segundos por R$1 doado"
            error={fieldErrors.secondsPerReal}
            hint="Ex: 60 = cada R$1 doado soma 1 minuto ao relógio"
          >
            <Input
              name="secondsPerReal"
              type="number"
              min="1"
              max="3600"
              defaultValue={initial.secondsPerReal}
            />
          </Field>
          <Field
            label="Teto de segundos (opcional)"
            error={fieldErrors.maxSeconds}
            hint="Deixe em branco para não ter limite"
          >
            <Input
              name="maxSeconds"
              type="number"
              min="1"
              defaultValue={initial.maxSeconds ?? ""}
              placeholder="Sem limite"
            />
          </Field>
        </div>
        <div>
          <Button type="submit" disabled={loading === "save"}>
            {loading === "save" ? (
              "Salvando..."
            ) : (
              <>
                <Timer size={15} /> Salvar
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
