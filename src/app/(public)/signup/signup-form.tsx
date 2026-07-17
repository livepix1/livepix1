"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { signupSchema } from "@/lib/validators";
import { registerUser } from "@/lib/actions/auth";

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const values = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    const parsed = signupSchema.safeParse(values);
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
    const result = await registerUser(parsed.data);
    if (!result.ok) {
      setLoading(false);
      if (result.fieldErrors) setErrors(result.fieldErrors);
      setFormError(result.error);
      return;
    }

    // Conta criada: já autentica.
    const res = await signIn("credentials", {
      redirect: false,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (res?.error) {
      setFormError("Conta criada, mas houve um erro ao entrar. Faça login.");
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {formError && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {formError}
        </p>
      )}
      <Field label="Nome" error={errors.name}>
        <Input name="name" type="text" placeholder="Seu nome" autoComplete="name" />
      </Field>
      <Field label="Email" error={errors.email}>
        <Input name="email" type="email" placeholder="voce@email.com" autoComplete="email" />
      </Field>
      <Field label="Senha" error={errors.password} hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" placeholder="••••••••" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? "Criando conta..." : "Criar conta grátis"}
      </Button>
    </form>
  );
}
