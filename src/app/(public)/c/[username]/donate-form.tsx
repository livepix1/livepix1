"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { formatBRL } from "@/lib/serialize";
import { createDonation, getDonationStatus } from "@/lib/actions/donations";

const PRESETS = [5, 10, 25, 50];

interface DonateFormProps {
  username: string;
  creatorName: string;
  minDonation: number;
  maxMessageLen: number;
  goals: { id: string; title: string }[];
  /** Fixa a doação numa campanha específica (página /campanhas/[slug]) — some com o seletor de meta. */
  campaignId?: string;
}

type QrState = { donationId: string; qrImage: string; pixCode: string };

export function DonateForm({
  username,
  creatorName,
  minDonation,
  maxMessageLen,
  goals,
  campaignId,
}: DonateFormProps) {
  const [amount, setAmount] = useState<string>("10");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<QrState | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling do status após gerar o QR.
  useEffect(() => {
    if (!qr || paid) return;
    pollRef.current = setInterval(async () => {
      const status = await getDonationStatus(qr.donationId);
      if (status === "PAID") {
        setPaid(true);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qr, paid]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const raw = {
      payerName: String(form.get("payerName") || ""),
      payerEmail: String(form.get("payerEmail") || ""),
      message,
      amount: Number(amount.replace(",", ".")) || 0,
      goalId: String(form.get("goalId") || "") || undefined,
      campaignId,
    };

    if (raw.amount < minDonation) {
      setErrors({ amount: `Mínimo de ${formatBRL(minDonation)}` });
      return;
    }

    setLoading(true);
    const res = await createDonation(username, raw);
    setLoading(false);

    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }
    setQr(res);
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

  if (paid) {
    return (
      <div className="py-6 text-center">
        <p className="font-display text-2xl text-emerald-400">Pagamento confirmado! 🎉</p>
        <p className="mt-2 text-sm text-white/60">
          Sua mensagem vai aparecer na tela de {creatorName}.
        </p>
      </div>
    );
  }

  if (qr) {
    return (
      <div className="text-center">
        <h3 className="text-lg">Escaneie para apoiar</h3>
        <p className="mt-1 text-sm text-white/50">Pague via PIX no app do seu banco.</p>
        <div className="mx-auto mt-4 w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
          <Image src={qr.qrImage} alt="QR Code PIX" width={240} height={240} unoptimized className="h-full w-full" />
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="mt-4 w-full rounded-xl border border-pixflow-cyan/40 px-4 py-3 text-sm text-pixflow-slate hover:border-pixflow-cyan hover:bg-pixflow-cyan/10"
        >
          {copied ? "Código copiado!" : "Copiar código PIX (copia e cola)"}
        </button>
        <p className="mt-3 text-xs text-white/40">
          Aguardando confirmação... assim que pagar, avisamos aqui.
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

      <div>
        <span className="mb-1.5 block text-sm font-medium text-pixflow-slate/80">
          Valor do apoio
        </span>
        <div className="mb-2 grid grid-cols-4 gap-2">
          {PRESETS.filter((p) => p >= minDonation).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={
                "rounded-xl border px-2 py-2 text-sm transition-colors " +
                (Number(amount) === p
                  ? "border-pixflow-cyan bg-pixflow-cyan/15 text-pixflow-cyan"
                  : "border-white/10 text-pixflow-slate/70 hover:border-pixflow-cyan/40")
              }
            >
              R$ {p}
            </button>
          ))}
        </div>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          step="0.01"
          min={minDonation}
          placeholder="Outro valor"
        />
        {errors.amount && (
          <span className="mt-1 block text-xs text-pixflow-magenta">{errors.amount}</span>
        )}
        <span className="mt-1 block text-xs text-white/40">
          Mínimo: {formatBRL(minDonation)}
        </span>
      </div>

      <Field label="Seu nome (aparece no alerta)" error={errors.payerName}>
        <Input name="payerName" placeholder="Anônimo" maxLength={60} />
      </Field>

      <Field label="Email (opcional, para recibo)" error={errors.payerEmail}>
        <Input name="payerEmail" type="email" placeholder="voce@email.com" />
      </Field>

      <div>
        <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-pixflow-slate/80">
          <span>Mensagem (lida na live)</span>
          <span className="text-xs text-white/40">
            {message.length}/{maxMessageLen}
          </span>
        </span>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxMessageLen))}
          placeholder="Manda aquele salve..."
        />
      </div>

      {!campaignId && goals.length > 0 && (
        <Field label="Contribuir para uma meta (opcional)">
          <select
            name="goalId"
            className="w-full rounded-xl border border-white/10 bg-pixflow-darker/60 px-4 py-3 text-pixflow-slate focus:border-pixflow-cyan focus:outline-none"
            defaultValue=""
          >
            <option value="">Sem meta específica</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading
          ? "Gerando QR..."
          : `Apoiar com ${formatBRL(Number(amount.replace(",", ".")) || 0)}`}
      </Button>
    </form>
  );
}
