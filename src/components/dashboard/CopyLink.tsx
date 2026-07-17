"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const display = url.replace(/^https?:\/\//, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard indisponível — silencioso
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <code className="flex-1 truncate rounded-lg border border-white/10 bg-pixflow-dark px-3 py-2 text-sm text-pixflow-cyan">
        {display}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-pixflow-cyan/40 px-4 py-2 text-sm text-pixflow-slate transition-colors hover:border-pixflow-cyan hover:bg-pixflow-cyan/10"
      >
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
