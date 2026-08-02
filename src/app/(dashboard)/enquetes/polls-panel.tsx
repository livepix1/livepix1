"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { createPoll, setPollStatus, deletePoll } from "@/lib/actions/polls";

export interface PollRow {
  id: string;
  question: string;
  isActive: boolean;
  options: { id: string; label: string; voteCount: number }[];
}

const OPTION_SLOTS = [0, 1, 2, 3, 4, 5];

export function PollsPanel({ polls }: { polls: PollRow[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const question = String(form.get("question") || "");
    const options = OPTION_SLOTS.map((i) => String(form.get(`option${i + 1}`) || "").trim()).filter(
      (v) => v.length > 0
    );
    setLoading(true);
    const res = await createPoll({ question, options });
    setLoading(false);
    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
      >
        <p className="font-medium text-pixflow-slate">Nova enquete</p>
        {formError && (
          <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
            {formError}
          </p>
        )}
        <Field label="Pergunta" error={errors.question}>
          <Input name="question" placeholder="Qual jogo eu jogo hoje?" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTION_SLOTS.map((i) => (
            <Field
              key={i}
              label={`Opção ${i + 1}${i < 2 ? "" : " (opcional)"}`}
              error={i === 0 || i === 1 ? errors.options : undefined}
            >
              <Input name={`option${i + 1}`} placeholder={`Opção ${i + 1}`} />
            </Field>
          ))}
        </div>
        <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar enquete"}
          </Button>
        </div>
      </form>

      <div className="grid gap-4">
        {polls.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">Nenhuma enquete ainda.</p>
        ) : (
          polls.map((p) => {
            const total = p.options.reduce((sum, o) => sum + o.voteCount, 0);
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-pixflow-slate">{p.question}</p>
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs " +
                      (p.isActive
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/10 text-white/50")
                    }
                  >
                    {p.isActive ? "Ativa" : "Encerrada"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2.5">
                  {p.options.map((o) => {
                    const pct = total > 0 ? Math.round((o.voteCount / total) * 100) : 0;
                    return (
                      <div key={o.id}>
                        <div className="mb-1 flex justify-between text-xs text-white/60">
                          <span>{o.label}</span>
                          <span>
                            {o.voteCount} {o.voteCount === 1 ? "voto" : "votos"} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pixflow-cyan to-pixflow-magenta"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-white/50">{total} votos no total</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await setPollStatus(p.id, !p.isActive);
                        router.refresh();
                      }}
                      className="text-xs text-pixflow-cyan hover:text-pixflow-magenta"
                    >
                      {p.isActive ? "Encerrar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deletePoll(p.id);
                        router.refresh();
                      }}
                      className="text-xs text-white/40 hover:text-pixflow-magenta"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
