"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { verificacaoSchema } from "@/lib/validators";
import { submitVerification } from "@/lib/actions/verification";

export function VerificationForm() {
  const [companyType, setCompanyType] = useState<
    "INDIVIDUAL" | "MEI" | "LIMITED" | "ASSOCIATION"
  >("INDIVIDUAL");
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
      cpfCnpj: String(form.get("cpfCnpj") || "").replace(/\D/g, ""),
      companyType,
      birthDate: String(form.get("birthDate") || ""),
      mobilePhone: String(form.get("mobilePhone") || "").replace(/\D/g, ""),
      address: String(form.get("address") || ""),
      addressNumber: String(form.get("addressNumber") || ""),
      province: String(form.get("province") || ""),
      postalCode: String(form.get("postalCode") || "").replace(/\D/g, ""),
      incomeValue: Number(String(form.get("incomeValue") || "").replace(",", ".")) || 0,
    };

    const parsed = verificacaoSchema.safeParse(raw);
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
    const res = await submitVerification(parsed.data);
    setLoading(false);

    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    setMessage(res.message);
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

      <Field label="Tipo de conta">
        <Select
          value={companyType}
          onChange={(e) => setCompanyType(e.target.value as typeof companyType)}
        >
          <option value="INDIVIDUAL">Pessoa física</option>
          <option value="MEI">MEI</option>
          <option value="LIMITED">Empresa (LTDA)</option>
          <option value="ASSOCIATION">Associação</option>
        </Select>
      </Field>

      <Field label={companyType === "INDIVIDUAL" ? "CPF" : "CNPJ"} error={errors.cpfCnpj}>
        <Input name="cpfCnpj" placeholder="Só números" />
      </Field>

      {companyType === "INDIVIDUAL" && (
        <Field label="Data de nascimento" error={errors.birthDate}>
          <Input name="birthDate" type="date" />
        </Field>
      )}

      <Field label="Celular (com DDD)" error={errors.mobilePhone}>
        <Input name="mobilePhone" placeholder="11999998888" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Endereço" error={errors.address}>
          <Input name="address" placeholder="Rua/Av." />
        </Field>
        <Field label="Número" error={errors.addressNumber}>
          <Input name="addressNumber" placeholder="123" />
        </Field>
        <Field label="Bairro" error={errors.province}>
          <Input name="province" placeholder="Centro" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CEP" error={errors.postalCode}>
          <Input name="postalCode" placeholder="Só números" />
        </Field>
        <Field
          label={companyType === "INDIVIDUAL" ? "Renda mensal (R$)" : "Faturamento mensal (R$)"}
          error={errors.incomeValue}
        >
          <Input name="incomeValue" type="number" step="0.01" min="0" placeholder="0,00" />
        </Field>
      </div>

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar para verificação"}
        </Button>
        <p className="mt-2 text-xs text-white/40">
          Seus dados são enviados direto ao Asaas para criar sua subconta — a plataforma nunca
          fica com sua chave de API em texto claro.
        </p>
      </div>
    </form>
  );
}
