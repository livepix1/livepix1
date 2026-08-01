"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { withdrawalSchema } from "@/lib/validators";
import { requestWithdrawal } from "@/lib/actions/dashboard";
import { computeWithdrawalFee, WITHDRAWAL_FEE_FIXED } from "@/lib/fee";
import { formatBRL } from "@/lib/serialize";

export function WithdrawalForm({
  balance,
  totpEnabled,
}: {
  balance: number;
  totpEnabled: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [destinationType, setDestinationType] = useState<"PIX" | "BANK">("PIX");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amountNum = Number(amount.replace(",", ".")) || 0;
  const { fee, net } = computeWithdrawalFee(amountNum);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const raw = {
      amount: amountNum,
      destinationType,
      destinationPixKey: String(form.get("destinationPixKey") || ""),
      destinationBank: String(form.get("destinationBank") || ""),
      destinationAgency: String(form.get("destinationAgency") || ""),
      destinationAccount: String(form.get("destinationAccount") || ""),
      totpCode: String(form.get("totpCode") || ""),
    };

    const parsed = withdrawalSchema.safeParse(raw);
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
    const res = await requestWithdrawal(parsed.data);
    setLoading(false);

    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    setMessage(res.message ?? "Saque solicitado");
    setAmount("");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {message}. Ele entra como pendente até ser processado.
        </div>
      )}
      {formError && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {formError}
        </p>
      )}

      <Field label="Saldo disponível">
        <Input value={formatBRL(balance)} readOnly disabled />
      </Field>

      <Field label="Quanto sacar (R$)" error={errors.amount}>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          step="0.01"
          min="1"
          placeholder="0,00"
        />
      </Field>

      <Field label="Destino">
        <Select
          value={destinationType}
          onChange={(e) => setDestinationType(e.target.value as "PIX" | "BANK")}
        >
          <option value="PIX">Chave PIX</option>
          <option value="BANK">Conta bancária</option>
        </Select>
      </Field>

      {destinationType === "PIX" ? (
        <Field label="Chave PIX" error={errors.destinationPixKey}>
          <Input name="destinationPixKey" placeholder="email, telefone, CPF ou chave aleatória" />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Banco" error={errors.destinationBank}>
            <Input name="destinationBank" placeholder="Ex.: 260 Nubank" />
          </Field>
          <Field label="Agência">
            <Input name="destinationAgency" placeholder="0001" />
          </Field>
          <Field label="Conta">
            <Input name="destinationAccount" placeholder="12345-6" />
          </Field>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-pixflow-dark px-4 py-3 text-sm">
        <div className="flex justify-between text-white/50">
          <span>Taxa por saque</span>
          <span>{formatBRL(fee)}</span>
        </div>
        <div className="mt-1 flex justify-between font-medium text-pixflow-slate">
          <span>Você recebe</span>
          <span>{formatBRL(net)}</span>
        </div>
      </div>

      {totpEnabled && (
        <Field label="Código do autenticador (2FA)" error={errors.totpCode}>
          <Input name="totpCode" placeholder="000000" maxLength={6} />
        </Field>
      )}

      <div>
        <Button type="submit" disabled={loading || amountNum <= 0}>
          {loading ? "Enviando..." : "Solicitar saque"}
        </Button>
        <p className="mt-2 text-xs text-white/40">
          Taxa fixa de {formatBRL(WITHDRAWAL_FEE_FIXED)} por operação.
        </p>
      </div>
    </form>
  );
}
