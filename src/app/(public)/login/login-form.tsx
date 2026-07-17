"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { loginSchema } from "@/lib/validators";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const values = {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    const parsed = loginSchema.safeParse(values);
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
    const res = await signIn("credentials", {
      redirect: false,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (res?.error) {
      setFormError("Email ou senha incorretos");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {formError && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {formError}
        </p>
      )}
      <Field label="Email" error={errors.email}>
        <Input name="email" type="email" placeholder="voce@email.com" autoComplete="email" />
      </Field>
      <Field label="Senha" error={errors.password}>
        <Input name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
      </Field>
      <div className="text-right">
        <span className="cursor-not-allowed text-xs text-white/40" title="Em breve">
          Esqueci minha senha
        </span>
      </div>
      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
