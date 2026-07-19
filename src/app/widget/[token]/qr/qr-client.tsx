"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/** Overlay de QR fixo apontando pra página pública do criador. */
export function QrClient({ url, label }: { url: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    if (canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, url, {
        width: 220,
        margin: 2,
        color: { dark: "#0A0E27", light: "#FFFFFF" },
      });
    }
  }, [url]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="overflow-hidden rounded-2xl border border-cyan-400/50 bg-white shadow-[0_0_30px_rgba(0,217,255,0.4)]">
        <canvas ref={canvasRef} />
        <p className="bg-[#0A0E27] px-3 py-2 text-center font-display text-sm text-cyan-300">
          {label}
        </p>
      </div>
    </div>
  );
}
