"use client";

/**
 * Widget de alertas (OBS Browser Source).
 * Resiliência: a fila vive no banco (AlertEvent). O Realtime é só o "empurrão";
 * sem ele (ou em reconexão), o polling de /pending drena o que ficou pra trás —
 * nenhum alerta se perde. Controls (skip/replay/pause/clear/test) chegam pelo
 * mesmo canal e também disparam re-sync.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { VolumeX } from "lucide-react";

interface AlertPayload {
  payerName?: string;
  amount?: number;
  grossAmount?: number;
  message?: string | null;
  flagged?: boolean;
  mediaUrl?: string;
  mediaType?: "AUDIO" | "VIDEO";
  /** Só toca a mídia quando o criador já aprovou na revisão manual de voz. */
  mediaApproved?: boolean;
}

interface WidgetEvent {
  id: string;
  type: string;
  payload: AlertPayload;
}

interface WidgetConfig {
  soundUrl: string | null;
  gifUrl: string | null;
  durationMs: number;
  ttsEnabled: boolean;
  ttsVoice: string | null;
  ttsMinAmount: number;
  minAlertAmount: number;
  paused: boolean;
}

const DEFAULT_SOUND =
  "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // placeholder curto

export function WidgetClient({ token }: { token: string }) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [current, setCurrent] = useState<WidgetEvent | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const queueRef = useRef<WidgetEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const pausedRef = useRef(false);
  const lastShownRef = useRef<WidgetEvent | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const configRef = useRef<WidgetConfig | null>(null);

  // Fundo transparente (OBS)
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  const ack = useCallback(
    (eventId: string) => {
      fetch(`/api/widget/${token}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      }).catch(() => {});
    },
    [token]
  );

  const enqueue = useCallback((ev: WidgetEvent) => {
    if (seenRef.current.has(ev.id)) return;
    seenRef.current.add(ev.id);
    queueRef.current.push(ev);
  }, []);

  // Loop de exibição — um alerta por vez.
  const pump = useCallback(() => {
    if (busyRef.current || pausedRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    busyRef.current = true;
    setCurrent(next);
    lastShownRef.current = next;
    ack(next.id);

    const cfg = configRef.current;
    const durationMs = cfg?.durationMs ?? 8000;

    // Som
    if (cfg?.soundUrl) {
      try {
        const audio = new Audio(cfg.soundUrl);
        audio.volume = 0.9;
        audio.play().catch(() => setNeedsAudioUnlock(true));
      } catch {
        /* sem som */
      }
    }

    // TTS (Web Speech) — depois de meio segundo pro som de entrada
    let utterance: SpeechSynthesisUtterance | null = null;
    const p = next.payload;
    const amountOk = (p.grossAmount ?? p.amount ?? 0) >= (cfg?.ttsMinAmount ?? 0);
    // Se tem áudio do doador aprovado, ele fala por si — TTS do texto ficaria
    // sobreposto e desnecessário.
    const hasApprovedAudio = p.mediaType === "AUDIO" && p.mediaApproved;
    if (
      cfg?.ttsEnabled &&
      p.message &&
      !p.flagged &&
      amountOk &&
      !hasApprovedAudio &&
      "speechSynthesis" in window
    ) {
      utterance = new SpeechSynthesisUtterance(
        `${p.payerName ?? "Anônimo"} mandou: ${p.message}`
      );
      utterance.lang = "pt-BR";
      if (cfg.ttsVoice) {
        const voice = window.speechSynthesis
          .getVoices()
          .find((v) => v.name === cfg.ttsVoice);
        if (voice) utterance.voice = voice;
      }
      setTimeout(() => {
        if (utterance) window.speechSynthesis.speak(utterance);
      }, 600);
    }

    const timer = setTimeout(finish, durationMs);
    function finish() {
      clearTimeout(timer);
      if (utterance) window.speechSynthesis.cancel();
      setCurrent(null);
      busyRef.current = false;
      skipRef.current = null;
      setTimeout(pump, 400);
    }
    skipRef.current = finish;
  }, [ack]);

  // Sincroniza config + pendentes (load, reconexão, e polling de segurança).
  const sync = useCallback(async () => {
    try {
      const res = await fetch(`/api/widget/${token}/pending`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { config: WidgetConfig; events: WidgetEvent[] };
      configRef.current = data.config;
      pausedRef.current = data.config.paused;
      setConfig(data.config);
      for (const ev of data.events) enqueue(ev);
      pump();
    } catch {
      /* offline — tenta de novo no próximo tick */
    }
  }, [token, enqueue, pump]);

  useEffect(() => {
    void sync();
    // Polling de segurança (e único mecanismo quando Realtime não está configurado).
    const interval = setInterval(sync, 10000);

    // Realtime (empurrão de baixa latência), se configurado.
    let cleanup: (() => void) | undefined;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      void import("@supabase/supabase-js").then(({ createClient }) => {
        const supabase = createClient(url, anon, {
          realtime: { params: { eventsPerSecond: 5 } },
        });
        const channel = supabase
          .channel(`widget:${token}`)
          .on("broadcast", { event: "alert" }, () => void sync())
          .on("broadcast", { event: "control" }, (msg) => {
            const action = (msg.payload as { action?: string }).action;
            if (action === "skip") skipRef.current?.();
            if (action === "replay" && lastShownRef.current && !busyRef.current) {
              queueRef.current.unshift(lastShownRef.current);
              pump();
            }
            if (action === "pause") pausedRef.current = true;
            if (action === "resume") {
              pausedRef.current = false;
              pump();
            }
            if (action === "clear") queueRef.current = [];
            if (action === "test" || action === "sync") void sync();
          })
          .subscribe();
        cleanup = () => {
          void supabase.removeChannel(channel);
        };
      });
    }

    return () => {
      clearInterval(interval);
      cleanup?.();
    };
  }, [token, sync, pump]);

  function unlockAudio() {
    setNeedsAudioUnlock(false);
    try {
      new Audio(config?.soundUrl ?? DEFAULT_SOUND).play().catch(() => {});
      window.speechSynthesis?.resume();
    } catch {
      /* ok */
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-transparent p-6">
      {needsAudioUnlock && (
        <button
          type="button"
          onClick={unlockAudio}
          className="fixed bottom-4 right-4 flex items-center gap-1.5 rounded-xl bg-black/80 px-4 py-2 text-sm text-white"
        >
          <VolumeX size={15} /> Clique para ativar o som
        </button>
      )}

      {current && (
        <div className="animate-fade-up relative w-full max-w-md overflow-hidden rounded-2xl border border-cyan-400/50 bg-[#0A0E27]/95 shadow-[0_0_40px_rgba(0,217,255,0.35)]">
          {config?.gifUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.gifUrl} alt="" className="h-36 w-full object-cover" />
          )}
          {/* Vídeo do doador aprovado — miniatura no canto do alerta. */}
          {current.payload.mediaUrl &&
            current.payload.mediaType === "VIDEO" &&
            current.payload.mediaApproved && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                autoPlay
                playsInline
                src={current.payload.mediaUrl}
                className="absolute right-2 top-2 h-20 w-20 rounded-xl border border-white/20 object-cover"
              />
            )}
          {/* Áudio do doador aprovado — toca junto com o alerta visual. */}
          {current.payload.mediaUrl &&
            current.payload.mediaType === "AUDIO" &&
            current.payload.mediaApproved && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio autoPlay src={current.payload.mediaUrl} className="hidden" />
            )}
          <div className="p-5 text-center">
            <p className="font-display text-xl text-white">
              <span className="text-cyan-300">
                {current.payload.payerName ?? "Anônimo"}
              </span>{" "}
              {current.type === "SUB" ? "assinou!" : "mandou"}{" "}
              {current.type !== "SUB" && (
                <span className="text-pink-500">
                  R${" "}
                  {(current.payload.grossAmount ?? current.payload.amount ?? 0).toFixed(2)}
                </span>
              )}
            </p>
            {current.payload.message && !current.payload.flagged && (
              <p className="mt-2 text-base text-white/85">{current.payload.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
