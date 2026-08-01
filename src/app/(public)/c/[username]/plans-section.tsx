"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { formatBRL } from "@/lib/serialize";
import { subscribeToPlan } from "@/lib/actions/subscriptions";

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  rewards: string[];
  hasDiscordReward: boolean;
  hasTelegramReward: boolean;
}

function PlanCard({ plan }: { plan: PublicPlan }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const raw = {
      subscriberName: String(form.get("subscriberName") || ""),
      subscriberEmail: String(form.get("subscriberEmail") || ""),
      discordUserId: String(form.get("discordUserId") || ""),
      telegramUserId: String(form.get("telegramUserId") || ""),
    };
    setLoading(true);
    const res = await subscribeToPlan(plan.id, raw);
    setLoading(false);
    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    if (res.paymentUrl) {
      setPaymentUrl(res.paymentUrl);
    } else {
      setFormError("Assinatura criada — aguardando confirmação do pagamento.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-pixflow-dark p-5">
      <p className="text-pixflow-slate">{plan.name}</p>
      <p className="mt-1 font-display text-2xl text-gradient-neon">
        {formatBRL(plan.price)}
        <span className="text-sm text-white/40">/mês</span>
      </p>
      {plan.description && <p className="mt-2 text-sm text-white/60">{plan.description}</p>}
      {plan.rewards.length > 0 && (
        <ul className="mt-3 grid gap-1">
          {plan.rewards.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/70">
              <span className="text-pixflow-cyan">✓</span> {r}
            </li>
          ))}
        </ul>
      )}

      {paymentUrl ? (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-xl bg-pixflow-cyan px-4 py-2.5 text-center text-sm font-semibold text-pixflow-darker hover:bg-pixflow-magenta hover:text-white"
        >
          Pagar assinatura ↗
        </a>
      ) : open ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          {formError && <p className="text-xs text-pixflow-magenta">{formError}</p>}
          <Field label="Seu nome" error={errors.subscriberName}>
            <Input name="subscriberName" placeholder="Seu nome" />
          </Field>
          <Field label="Seu email" error={errors.subscriberEmail}>
            <Input name="subscriberEmail" type="email" placeholder="voce@email.com" />
          </Field>
          {plan.hasDiscordReward && (
            <Field label="Seu ID do Discord" hint="Ative o modo desenvolvedor no Discord pra copiar seu ID">
              <Input name="discordUserId" placeholder="123456789012345678" />
            </Field>
          )}
          {plan.hasTelegramReward && (
            <Field label="Seu ID do Telegram" hint="Peça pro bot @userinfobot pra descobrir seu ID">
              <Input name="telegramUserId" placeholder="123456789" />
            </Field>
          )}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Criando..." : "Assinar"}
          </Button>
        </form>
      ) : (
        <Button className="mt-4" fullWidth onClick={() => setOpen(true)}>
          Assinar
        </Button>
      )}
    </div>
  );
}

export function PlansSection({ plans }: { plans: PublicPlan[] }) {
  if (plans.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}
