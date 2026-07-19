"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { CopyLink } from "@/components/dashboard/CopyLink";
import { saveCreatorProfile } from "@/lib/actions/creator";

interface Props {
  initial: {
    displayName: string;
    bio: string;
    bannerUrl: string;
    minDonation: string;
    maxMessageLen: string;
    isPublic: boolean;
  } | null;
  publicUrl: string | null;
  usernameMissing: boolean;
}

export function ProfilePageForm({ initial, publicUrl, usernameMissing }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const raw = {
      displayName: String(form.get("displayName") || ""),
      bio: String(form.get("bio") || ""),
      bannerUrl: String(form.get("bannerUrl") || ""),
      minDonation: String(form.get("minDonation") || "1"),
      maxMessageLen: String(form.get("maxMessageLen") || "200"),
      isPublic: String(form.get("isPublic")) === "true",
    };

    setLoading(true);
    const res = await saveCreatorProfile(raw);
    setLoading(false);

    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    setMessage(res.message ?? "Salvo");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {message}
          {publicUrl && <CopyLink url={publicUrl} />}
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
          ativar sua página pública.
        </p>
      )}

      <Field label="Nome de exibição" error={errors.displayName}>
        <Input name="displayName" defaultValue={initial?.displayName} placeholder="Como seu público te conhece" />
      </Field>

      <Field label="Bio" error={errors.bio} hint="Até 300 caracteres">
        <Textarea name="bio" defaultValue={initial?.bio} placeholder="Fale sobre você e seu conteúdo" />
      </Field>

      <Field label="Banner (URL da imagem)" error={errors.bannerUrl} hint="Opcional">
        <Input name="bannerUrl" defaultValue={initial?.bannerUrl} placeholder="https://..." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Doação mínima (R$)" error={errors.minDonation}>
          <Input name="minDonation" type="number" step="0.01" min="1" defaultValue={initial?.minDonation ?? "1"} />
        </Field>
        <Field label="Tamanho máx. da mensagem" error={errors.maxMessageLen} hint="50 a 400 caracteres">
          <Input name="maxMessageLen" type="number" min="50" max="400" defaultValue={initial?.maxMessageLen ?? "200"} />
        </Field>
      </div>

      <Field label="Página pública">
        <Select name="isPublic" defaultValue={String(initial?.isPublic ?? true)}>
          <option value="true">Ativa (qualquer um pode apoiar)</option>
          <option value="false">Oculta (só você vê)</option>
        </Select>
      </Field>

      {publicUrl && !message && (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-pixflow-slate/80">
            Sua página
          </span>
          <CopyLink url={publicUrl} />
        </div>
      )}

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar página"}
        </Button>
      </div>
    </form>
  );
}
