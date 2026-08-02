"use client";

/**
 * Widget de Maratona (OBS Browser Source).
 * O relógio conta regressivamente no PRÓPRIO CLIENTE (setInterval de 1s) —
 * o servidor só guarda o valor "verdadeiro" (remainingSeconds), que sobe
 * quando chega doação. Re-sincroniza a cada 15s: se o servidor está na
 * frente do relógio local (chegou doação nesse meio tempo), pula pra frente;
 * nunca deixa o timer andar pra trás sozinho por causa de round-trip de rede.
 */

import { useEffect, useRef, useState } from "react";

interface MarathonState {
  isActive: boolean;
  remainingSeconds: number;
  secondsPerReal: number;
}

const RESYNC_MS = 15000;

function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function MaratonaClient({ token }: { token: string }) {
  const [state, setState] = useState<MarathonState | null>(null);
  const [display, setDisplay] = useState(0);
  const localRef = useRef(0);
  const loadedRef = useRef(false);

  // Fundo transparente (OBS) — mesmo padrão do widget de alertas.
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch(`/api/widget/${token}/marathon`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as MarathonState;
        setState(data);
        // Só avança o relógio local se o servidor estiver na frente — nunca
        // deixa o round-trip de rede empurrar o timer pra trás.
        if (!loadedRef.current || data.remainingSeconds > localRef.current) {
          localRef.current = data.remainingSeconds;
          setDisplay(data.remainingSeconds);
        }
        loadedRef.current = true;
      } catch {
        /* offline — mantém contando local até a próxima tentativa */
      }
    }

    void sync();
    const resyncInterval = setInterval(sync, RESYNC_MS);
    return () => {
      cancelled = true;
      clearInterval(resyncInterval);
    };
  }, [token]);

  // Decremento local de 1 em 1 segundo enquanto ativo.
  useEffect(() => {
    const tick = setInterval(() => {
      if (!state?.isActive) return;
      localRef.current = Math.max(0, localRef.current - 1);
      setDisplay(localRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, [state?.isActive]);

  if (!state) {
    return <div className="min-h-screen bg-transparent" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/50 bg-[#0A0E27]/95 px-10 py-6 text-center shadow-[0_0_40px_rgba(0,217,255,0.35)]">
        {!state.isActive && (
          <p className="mb-1 text-xs uppercase tracking-widest text-white/40">
            Maratona pausada
          </p>
        )}
        <p className="font-display text-6xl tabular-nums text-gradient-neon">
          {formatHMS(display)}
        </p>
      </div>
    </div>
  );
}
