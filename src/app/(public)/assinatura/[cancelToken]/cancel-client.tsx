"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cancelSubscriptionByToken } from "@/lib/actions/subscriptions";

export function CancelClient({ cancelToken }: { cancelToken: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCancel() {
    setLoading(true);
    setError(null);
    const res = await cancelSubscriptionByToken(cancelToken);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-center text-emerald-400">
        Assinatura cancelada. Você não será mais cobrado.
      </p>
    );
  }

  return (
    <div className="grid gap-4 text-center">
      {error && <p className="text-sm text-pixflow-magenta">{error}</p>}
      <p className="text-sm text-white/60">
        Tem certeza que quer cancelar sua assinatura? Você perderá o acesso às
        recompensas do plano na próxima renovação.
      </p>
      <Button onClick={onCancel} disabled={loading} className="mx-auto">
        {loading ? "Cancelando..." : "Cancelar assinatura"}
      </Button>
    </div>
  );
}
