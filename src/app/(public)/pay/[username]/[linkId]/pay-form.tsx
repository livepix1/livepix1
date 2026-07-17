"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { payerSchema } from "@/lib/validators";
import { formatBRL } from "@/lib/serialize";

interface PayFormProps {
  linkId: string;
  fixedValue: number | null;
}

type QrResult = { qrImage: string; pixCode: string; chargeId: string };

export function PayForm({ linkId, fixedValue }: PayFormProps) {
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<QrResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const raw = {
      payerName: String(form.get("payerName") || ""),
      payerEmail: String(form.get("payerEmail") || ""),
      payerMessage: String(form.get("payerMessage") || ""),
      amount: fixedValue !== null ? fixedValue : Number(amount.replace(",", ".")) || 0,
    };

    const parsed = payerSchema.safeParse(raw);
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
    try {
      const res = await fetch("/api/asaas/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, ...parsed.data }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setFormError(data?.error ?? "Não foi possível gerar o pagamento.");
        return;
      }
      setQr(data as QrResult);
    } catch {
      setLoading(false);
      setFormError("Erro de conexão. Tente novamente.");
    }
  }

  async function copyCode() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* silencioso */
    }
  }

  if (qr) {
    return (
      <div className="text-center">
        <h3 className="text-lg">Escaneie para pagar</h3>
        <p className="mt-1 text-sm text-white/50">
          Abra o app do seu banco e pague via PIX.
        </p>
        <div className="mx-auto mt-5 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
          <Image
            src={qr.qrImage}
            alt="QR Code PIX"
            width={280}
            height={280}
            unoptimized
            className="h-full w-full"
          />
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="mt-4 w-full rounded-xl border border-pixflow-cyan/40 px-4 py-3 text-sm text-pixflow-slate hover:border-pixflow-cyan hover:bg-pixflow-cyan/10"
        >
          {copied ? "Código copiado!" : "Copiar código PIX (copia e cola)"}
        </button>
        <p className="mt-4 text-xs text-white/40">
          Assim que o pagamento for confirmado, o recebedor é notificado
          automaticamente.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {formError && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {formError}
        </p>
      )}

      {fixedValue === null && (
        <Field label="Valor (R$)" error={errors.amount}>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
          />
        </Field>
      )}

      <Field label="Seu nome" error={errors.payerName}>
        <Input name="payerName" placeholder="Como você quer ser identificado" />
      </Field>
      <Field label="Seu email" error={errors.payerEmail}>
        <Input name="payerEmail" type="email" placeholder="voce@email.com" />
      </Field>
      <Field label="Mensagem (opcional)" error={errors.payerMessage}>
        <Textarea name="payerMessage" placeholder="Deixe um recado" />
      </Field>

      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading
          ? "Gerando..."
          : fixedValue !== null
            ? `Pagar ${formatBRL(fixedValue)}`
            : "Gerar QR Code"}
      </Button>
    </form>
  );
}
