"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { CopyLink } from "@/components/dashboard/CopyLink";
import { paymentLinkSchema } from "@/lib/validators";
import { saveLink } from "@/lib/actions/dashboard";

interface LinkFormProps {
  initial: {
    linkType: string;
    title: string;
    description: string;
    value: string;
    imageUrl: string;
  } | null;
  publicLink: string | null;
  usernameMissing: boolean;
}

export function LinkForm({ initial, publicLink, usernameMissing }: LinkFormProps) {
  const [linkType, setLinkType] = useState(initial?.linkType ?? "VALOR_FIXO");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showValue = linkType !== "DOACAO";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const raw = {
      linkType,
      title: String(form.get("title") || ""),
      description: String(form.get("description") || ""),
      value: showValue ? String(form.get("value") || "") : "",
      imageUrl: String(form.get("imageUrl") || ""),
    };

    const parsed = paymentLinkSchema.safeParse({
      ...raw,
      value: raw.value === "" ? undefined : raw.value,
      description: raw.description || undefined,
      imageUrl: raw.imageUrl || undefined,
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0];
        if (typeof k === "string" && !fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }

    setLoading(true);
    const res = await saveLink(parsed.data);
    setLoading(false);

    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    setMessage(res.message ?? "Link salvo");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {message}
          {publicLink && <CopyLink url={publicLink} />}
        </div>
      )}
      {formError && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {formError}
        </p>
      )}
      {usernameMissing && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
          Defina um nome de usuário no <a className="underline" href="/perfil">Perfil</a> para
          ativar o link público.
        </p>
      )}

      <Field label="Tipo de link">
        <Select value={linkType} onChange={(e) => setLinkType(e.target.value)} name="linkType">
          <option value="VALOR_FIXO">Valor fixo</option>
          <option value="DOACAO">Doação (valor livre)</option>
          <option value="CONSULTORIA">Consultoria</option>
        </Select>
      </Field>

      <Field label="Título" error={errors.title}>
        <Input name="title" defaultValue={initial?.title} placeholder="Ex.: Consultoria 1h" />
      </Field>

      <Field label="Descrição" error={errors.description} hint="Opcional, até 500 caracteres">
        <Textarea name="description" defaultValue={initial?.description} placeholder="Explique o que o cliente recebe" />
      </Field>

      {showValue && (
        <Field label="Valor (R$)" error={errors.value} hint="Deixe em branco para valor livre">
          <Input name="value" type="number" step="0.01" min="0" defaultValue={initial?.value} placeholder="0,00" />
        </Field>
      )}

      <Field label="Imagem (URL)" error={errors.imageUrl} hint="Opcional — link de uma imagem">
        <Input name="imageUrl" defaultValue={initial?.imageUrl} placeholder="https://..." />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar link"}
        </Button>
      </div>
    </form>
  );
}
