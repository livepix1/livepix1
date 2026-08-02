"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatBRL } from "@/lib/serialize";
import { createCampaign, setCampaignStatus, deleteCampaign } from "@/lib/actions/campaigns";

export interface CampaignRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  targetAmount: number | null;
  raisedAmount: number;
  status: string;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Ativa", className: "bg-emerald-500/15 text-emerald-400" },
  ENDED: { label: "Encerrada", className: "bg-white/10 text-white/50" },
  CANCELED: { label: "Cancelada", className: "bg-pixflow-magenta/15 text-pixflow-magenta" },
};

export function CampaignsPanel({
  username,
  campaigns,
}: {
  username: string | null;
  campaigns: CampaignRow[];
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const raw = {
      title: String(form.get("title") || ""),
      slug: String(form.get("slug") || "").toLowerCase(),
      description: String(form.get("description") || ""),
      targetAmount: form.get("targetAmount") ? Number(form.get("targetAmount")) : undefined,
      endsAt: String(form.get("endsAt") || ""),
    };
    setLoading(true);
    const res = await createCampaign(raw);
    setLoading(false);
    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function copyUrl(slug: string) {
    if (!username) return;
    const url = `${window.location.origin}/c/${username}/campanhas/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1800);
    } catch {
      /* silencioso */
    }
  }

  return (
    <div className="grid gap-6">
      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
      >
        <p className="font-medium text-pixflow-slate">Nova campanha</p>
        {formError && (
          <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
            {formError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" error={errors.title}>
            <Input name="title" placeholder="Reforma do estúdio" />
          </Field>
          <Field label="URL (slug)" error={errors.slug} hint="Só letras minúsculas, números e hífen">
            <Input name="slug" placeholder="reforma-do-estudio" />
          </Field>
        </div>
        <Field label="Descrição (opcional)" error={errors.description}>
          <Textarea name="description" placeholder="Conte pra que serve essa campanha" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meta (R$, opcional)" error={errors.targetAmount}>
            <Input name="targetAmount" type="number" step="0.01" min="1" placeholder="5000" />
          </Field>
          <Field label="Termina em (opcional)">
            <Input name="endsAt" type="date" />
          </Field>
        </div>
        <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar campanha"}
          </Button>
        </div>
      </form>

      <div className="grid gap-4">
        {campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title="Nenhuma campanha ainda" hint="Crie a primeira acima." />
        ) : (
          campaigns.map((c) => {
            const pct = c.targetAmount
              ? Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100))
              : null;
            const status = STATUS_LABEL[c.status] ?? STATUS_LABEL.ACTIVE;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-pixflow-slate">{c.title}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                {pct !== null && (
                  <>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pixflow-cyan to-pixflow-magenta"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-pixflow-cyan">{pct}%</p>
                  </>
                )}
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">
                    {formatBRL(c.raisedAmount)}
                    {c.targetAmount ? ` / ${formatBRL(c.targetAmount)}` : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copyUrl(c.slug)}
                      className="text-xs text-pixflow-cyan hover:text-pixflow-magenta"
                    >
                      {copiedSlug === c.slug ? "Copiado!" : "Copiar link"}
                    </button>
                    {c.status !== "CANCELED" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await setCampaignStatus(c.id, c.status === "ACTIVE" ? "ENDED" : "ACTIVE");
                          router.refresh();
                        }}
                        className="text-xs text-pixflow-cyan hover:text-pixflow-magenta"
                      >
                        {c.status === "ACTIVE" ? "Encerrar" : "Reativar"}
                      </button>
                    )}
                    {c.status !== "CANCELED" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteCampaign(c.id);
                          router.refresh();
                        }}
                        className="text-xs text-white/40 hover:text-pixflow-magenta"
                      >
                        Excluir
                      </button>
                    )}
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
