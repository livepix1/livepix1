"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { profileSchema } from "@/lib/validators";
import { updateProfile } from "@/lib/actions/dashboard";

interface ProfileFormProps {
  initial: {
    name: string;
    email: string;
    username: string;
    cpf: string;
    accountType: string;
    pixKey: string;
    avatar: string;
  };
}

export function ProfileForm({ initial }: ProfileFormProps) {
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
      name: String(form.get("name") || ""),
      username: String(form.get("username") || ""),
      cpf: String(form.get("cpf") || ""),
      accountType: String(form.get("accountType") || "PF"),
      pixKey: String(form.get("pixKey") || ""),
      avatar: String(form.get("avatar") || ""),
    };

    const parsed = profileSchema.safeParse({
      ...raw,
      username: raw.username || undefined,
      cpf: raw.cpf || undefined,
      pixKey: raw.pixKey || undefined,
      avatar: raw.avatar || undefined,
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
    const res = await updateProfile(parsed.data);
    setLoading(false);

    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    setMessage(res.message ?? "Perfil atualizado");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {message}
        </div>
      )}
      {formError && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {formError}
        </p>
      )}

      <Field label="Nome" error={errors.name}>
        <Input name="name" defaultValue={initial.name} />
      </Field>

      <Field label="Email">
        <Input value={initial.email} readOnly disabled />
      </Field>

      <Field
        label="Nome de usuário"
        error={errors.username}
        hint="Usado no seu link público: /pay/seu-usuario/..."
      >
        <Input name="username" defaultValue={initial.username} placeholder="seu-usuario" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF" error={errors.cpf} hint="Só números">
          <Input name="cpf" defaultValue={initial.cpf} placeholder="00000000000" />
        </Field>
        <Field label="Tipo de conta">
          <Select name="accountType" defaultValue={initial.accountType}>
            <option value="PF">Pessoa Física</option>
            <option value="CNPJ">Pessoa Jurídica</option>
          </Select>
        </Field>
      </div>

      <Field label="Chave PIX principal" error={errors.pixKey}>
        <Input name="pixKey" defaultValue={initial.pixKey} placeholder="Sua chave para receber saques" />
      </Field>

      <Field label="Avatar (URL)" error={errors.avatar} hint="Opcional">
        <Input name="avatar" defaultValue={initial.avatar} placeholder="https://..." />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
        <span
          className="cursor-not-allowed text-sm text-white/30"
          title="Em breve"
        >
          Mudar senha
        </span>
      </div>
    </form>
  );
}
