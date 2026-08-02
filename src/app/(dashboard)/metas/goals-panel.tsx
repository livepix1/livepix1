"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatBRL } from "@/lib/serialize";
import { createGoal, toggleGoal, deleteGoal } from "@/lib/actions/goals";

export interface GoalRow {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  isActive: boolean;
  endsAt: string | null;
}

export function GoalsPanel({ goals }: { goals: GoalRow[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Atualiza os valores ao vivo (doações mudam currentAmount fora desta aba).
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(interval);
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const raw = {
      title: String(form.get("title") || ""),
      targetAmount: String(form.get("targetAmount") || ""),
      endsAt: String(form.get("endsAt") || ""),
    };
    setLoading(true);
    const res = await createGoal(raw);
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
        <p className="font-medium text-pixflow-slate">Nova meta</p>
        {formError && (
          <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
            {formError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Título" error={errors.title}>
            <Input name="title" placeholder="Meta do microfone" />
          </Field>
          <Field label="Valor alvo (R$)" error={errors.targetAmount}>
            <Input name="targetAmount" type="number" step="0.01" min="1" placeholder="500" />
          </Field>
          <Field label="Termina em (opcional)">
            <Input name="endsAt" type="date" />
          </Field>
        </div>
        <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar meta"}
          </Button>
        </div>
      </form>

      <div className="grid gap-4">
        {goals.length === 0 ? (
          <EmptyState icon={Target} title="Nenhuma meta ainda" hint="Crie a primeira acima." />
        ) : (
          goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
            return (
              <div
                key={g.id}
                className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-pixflow-slate">{g.title}</p>
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs " +
                      (g.isActive
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/10 text-white/50")
                    }
                  >
                    {g.isActive ? "Ativa" : "Pausada"}
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pixflow-cyan to-pixflow-magenta"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">
                    {formatBRL(g.currentAmount)} / {formatBRL(g.targetAmount)} ({pct}%)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleGoal(g.id, !g.isActive);
                        router.refresh();
                      }}
                      className="text-xs text-pixflow-cyan hover:text-pixflow-magenta"
                    >
                      {g.isActive ? "Pausar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteGoal(g.id);
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
