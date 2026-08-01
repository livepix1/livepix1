"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { startTotpSetup, confirmTotpSetup, disableTotp } from "@/lib/actions/security";

export function TotpPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; qrImage: string } | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function beginSetup() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await startTotpSetup();
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSetup({ secret: res.secret, qrImage: res.qrImage });
  }

  async function confirm() {
    if (!setup) return;
    setError(null);
    setLoading(true);
    const res = await confirmTotpSetup(setup.secret, code);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage(res.message ?? "2FA ativado");
    setSetup(null);
    setCode("");
    router.refresh();
  }

  async function disable() {
    setError(null);
    setLoading(true);
    const res = await disableTotp(disableCode);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage(res.message ?? "2FA desativado");
    setDisableCode("");
    router.refresh();
  }

  if (enabled) {
    return (
      <div className="grid gap-4">
        {message && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
            {message}
          </p>
        )}
        <p className="text-sm text-emerald-400">
          2FA ativado. Todo saque vai exigir um código do seu app autenticador.
        </p>
        {error && (
          <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
            {error}
          </p>
        )}
        <Field label="Código atual (pra desativar)">
          <Input
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
          />
        </Field>
        <div>
          <Button variant="outline" onClick={disable} disabled={loading || disableCode.length !== 6}>
            {loading ? "Desativando..." : "Desativar 2FA"}
          </Button>
        </div>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="grid gap-4">
        {message && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
            {error}
          </p>
        )}
        <p className="text-sm text-white/60">
          Proteja seus saques com um código de 6 dígitos gerado por um app autenticador
          (Google Authenticator, Authy, etc).
        </p>
        <div>
          <Button onClick={beginSetup} disabled={loading}>
            {loading ? "Gerando..." : "Ativar 2FA"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {error && (
        <p className="rounded-xl border border-pixflow-magenta/40 bg-pixflow-magenta/10 px-4 py-2.5 text-sm text-pixflow-magenta">
          {error}
        </p>
      )}
      <p className="text-sm text-white/60">
        Escaneie o QR no seu app autenticador e digite o código de 6 dígitos pra confirmar.
      </p>
      <div className="mx-auto w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
        <Image src={setup.qrImage} alt="QR do 2FA" width={200} height={200} unoptimized className="h-full w-full" />
      </div>
      <p className="text-center text-xs text-white/40">
        Não consegue escanear? Digite manualmente: <code className="text-pixflow-cyan">{setup.secret}</code>
      </p>
      <Field label="Código de confirmação">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
        />
      </Field>
      <div className="flex gap-2">
        <Button onClick={confirm} disabled={loading || code.length !== 6}>
          {loading ? "Confirmando..." : "Confirmar e ativar"}
        </Button>
        <Button variant="ghost" onClick={() => setSetup(null)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
