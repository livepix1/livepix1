"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { formatBRL } from "@/lib/serialize";
import { createPlan, togglePlan, deletePlan } from "@/lib/actions/plans";

export interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  activeSubscribers: number;
  discordRoleId: string | null;
  telegramGroupId: string | null;
}

export function PlansPanel({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const raw = {
      name: String(form.get("name") || ""),
      description: String(form.get("description") || ""),
      price: String(form.get("price") || ""),
      rewards: String(form.get("rewards") || ""),
      discordRoleId: String(form.get("discordRoleId") || ""),
      discordGuildId: String(form.get("discordGuildId") || ""),
      telegramGroupId: String(form.get("telegramGroupId") || ""),
    };
    setLoading(true);
    const res = await createPlan(raw);
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
        <p className="font-medium text-pixflow-slate">Novo plano</p>
        {formError && (
          <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
            {formError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do plano" error={errors.name}>
            <Input name="name" placeholder="Apoiador VIP" />
          </Field>
          <Field label="Preço mensal (R$)" error={errors.price}>
            <Input name="price" type="number" step="0.01" min="1" placeholder="19,90" />
          </Field>
        </div>
        <Field label="Descrição" error={errors.description}>
          <Textarea name="description" placeholder="O que esse plano oferece" />
        </Field>
        <Field label="Vantagens" hint="Uma por linha">
          <Textarea name="rewards" placeholder={"Cargo exclusivo no Discord\nAcesso ao grupo VIP"} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Servidor do Discord (ID)" hint="Opcional — requer bot conectado">
            <Input name="discordGuildId" placeholder="123456789012345678" />
          </Field>
          <Field label="Cargo do Discord (ID)" hint="Opcional — requer bot conectado">
            <Input name="discordRoleId" placeholder="123456789012345678" />
          </Field>
          <Field label="Grupo do Telegram (ID)" hint="Opcional — requer bot conectado">
            <Input name="telegramGroupId" placeholder="-1001234567890" />
          </Field>
        </div>
        <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar plano"}
          </Button>
        </div>
      </form>

      <div className="grid gap-4">
        {plans.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">Nenhum plano ainda.</p>
        ) : (
          plans.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pixflow-slate">{p.name}</p>
                  <p className="text-sm text-white/50">
                    {formatBRL(p.price)}/mês · {p.activeSubscribers} assinante
                    {p.activeSubscribers === 1 ? "" : "s"} ativo
                    {p.activeSubscribers === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-2.5 py-0.5 text-xs " +
                    (p.isActive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/10 text-white/50")
                  }
                >
                  {p.isActive ? "Ativo" : "Pausado"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await togglePlan(p.id, !p.isActive);
                    router.refresh();
                  }}
                  className="text-xs text-pixflow-cyan hover:text-pixflow-magenta"
                >
                  {p.isActive ? "Pausar" : "Reativar"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deletePlan(p.id);
                    router.refresh();
                  }}
                  className="text-xs text-white/40 hover:text-pixflow-magenta"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
