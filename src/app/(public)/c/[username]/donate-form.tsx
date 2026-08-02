"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mic, Circle, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { formatBRL } from "@/lib/serialize";
import { createDonation, getDonationStatus, attachDonationMedia } from "@/lib/actions/donations";
import { submitMediaRequest } from "@/lib/actions/media-requests";

const PRESETS = [5, 10, 25, 50];
const MAX_RECORDING_MS = 15000;

/** Lê um Blob e devolve só a parte base64 (sem o prefixo `data:...;base64,`). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface DonateFormProps {
  username: string;
  creatorName: string;
  minDonation: number;
  maxMessageLen: number;
  goals: { id: string; title: string }[];
  /** Fixa a doação numa campanha específica (página /campanhas/[slug]) — some com o seletor de meta. */
  campaignId?: string;
  /** Habilita o campo de "link de vídeo/música" — some por padrão (widgets P1). */
  /** Tipos de pedido de mídia liberados pelo criador (widgets P1). Vazio = campo não aparece. */
  mediaRequestKinds?: ("VIDEO" | "MUSIC")[];
}

type QrState = { donationId: string; qrImage: string; pixCode: string };

export function DonateForm({
  username,
  creatorName,
  minDonation,
  maxMessageLen,
  goals,
  campaignId,
  mediaRequestKinds = [],
}: DonateFormProps) {
  const [amount, setAmount] = useState<string>("10");
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  // Quando o criador libera os dois tipos, o doador escolhe; com um só, é fixo.
  const [mediaKind, setMediaKind] = useState<"VIDEO" | "MUSIC">(
    mediaRequestKinds[0] ?? "VIDEO"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<QrState | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gravação de áudio (mensagem de voz do doador) — opcional, até 15s.
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "recorded">(
    "idle"
  );
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        recordedBlobRef.current = blob;
        setRecordedUrl(URL.createObjectURL(blob));
        setRecordingState("recorded");
        stopStream();
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      };
      recorder.start();
      setRecordingState("recording");
      recordTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_MS);
    } catch {
      setRecordError("Não consegui acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function discardRecording() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    recordedBlobRef.current = null;
    setRecordedUrl(null);
    setRecordingState("idle");
  }

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (!res.ok) {
      setLoading(false);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setFormError(res.error);
      return;
    }

    // Anexa a gravação de voz (se houver) — melhor esforço, nunca bloqueia o
    // fluxo de pagamento se falhar (ex.: storage não configurado).
    if (recordedBlobRef.current) {
      try {
        const base64 = await blobToBase64(recordedBlobRef.current);
        await attachDonationMedia(res.donationId, base64, "AUDIO");
      } catch {
        /* silencioso — a doação já foi criada normalmente */
      }
    }

    // Anexa o pedido de vídeo/música (se o widget estiver habilitado e o
    // doador preencheu o link) — melhor esforço, nunca bloqueia o pagamento.
    if (mediaRequestKinds.length > 0 && mediaUrl.trim()) {
      try {
        await submitMediaRequest(res.donationId, mediaKind, mediaUrl.trim(), raw.payerName);
      } catch {
        /* silencioso — a doação já foi criada normalmente */
      }
    }

    setLoading(false);
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
        <p className="flex items-center justify-center gap-2 font-display text-2xl text-emerald-400">
          <PartyPopper size={22} /> Pagamento confirmado!
        </p>
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

      <div>
        <span className="mb-1.5 block text-sm font-medium text-pixflow-slate/80">
          Gravar um áudio (até 15s, opcional)
        </span>
        {recordingState === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-pixflow-slate/80 hover:border-pixflow-cyan/40"
          >
            <Mic size={15} /> Gravar mensagem de voz
          </button>
        )}
        {recordingState === "recording" && (
          <button
            type="button"
            onClick={stopRecording}
            className="flex w-full animate-pulse items-center justify-center gap-2 rounded-xl border border-pixflow-magenta/50 bg-pixflow-magenta/10 px-4 py-3 text-sm text-pixflow-magenta"
          >
            <Circle size={12} className="fill-current" /> Gravando... toque para parar (máx. 15s)
          </button>
        )}
        {recordingState === "recorded" && recordedUrl && (
          <div className="rounded-xl border border-white/10 p-3">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={recordedUrl} className="w-full" />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={discardRecording}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-pixflow-slate/70 hover:border-pixflow-cyan/40"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => {
                  discardRecording();
                  startRecording();
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-pixflow-slate/70 hover:border-pixflow-cyan/40"
              >
                Regravar
              </button>
            </div>
          </div>
        )}
        {recordError && (
          <span className="mt-1 block text-xs text-pixflow-magenta">{recordError}</span>
        )}
      </div>

      {mediaRequestKinds.length > 0 && (
        <div className="grid gap-2">
          {mediaRequestKinds.length > 1 && (
            <Field label="Tipo de pedido (opcional)">
              <select
                value={mediaKind}
                onChange={(e) => setMediaKind(e.target.value as "VIDEO" | "MUSIC")}
                className="w-full rounded-xl border border-white/10 bg-pixflow-darker/60 px-4 py-3 text-pixflow-slate focus:border-pixflow-cyan focus:outline-none"
              >
                <option value="VIDEO">Vídeo (YouTube)</option>
                <option value="MUSIC">Música</option>
              </select>
            </Field>
          )}
          <Field
            label={`Link ${mediaKind === "VIDEO" ? "do vídeo (YouTube)" : "da música"} (opcional)`}
          >
            <Input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              type="url"
              placeholder={
                mediaKind === "VIDEO"
                  ? "https://www.youtube.com/watch?v=..."
                  : "https://..."
              }
            />
          </Field>
        </div>
      )}

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
