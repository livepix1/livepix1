import { cn } from "@/lib/cn";

const MAP: Record<string, { label: string; className: string }> = {
  PAID: { label: "Pago", className: "bg-emerald-500/15 text-emerald-400" },
  COMPLETED: { label: "Concluído", className: "bg-emerald-500/15 text-emerald-400" },
  PENDING: { label: "Pendente", className: "bg-amber-500/15 text-amber-400" },
  AWAITING_CONFIRMATION: {
    label: "Aguardando confirmação",
    className: "bg-amber-500/15 text-amber-400",
  },
  PROCESSING: { label: "Processando", className: "bg-pixflow-cyan/15 text-pixflow-cyan" },
  FAILED: { label: "Falhou", className: "bg-pixflow-magenta/15 text-pixflow-magenta" },
  APPROVED: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-400" },
  REJECTED: { label: "Rejeitado", className: "bg-pixflow-magenta/15 text-pixflow-magenta" },
  NONE: { label: "Não iniciado", className: "bg-white/10 text-white/50" },
};

export function StatusBadge({ status }: { status: string }) {
  const item = MAP[status] ?? {
    label: status,
    className: "bg-white/10 text-white/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        item.className
      )}
    >
      {item.label}
    </span>
  );
}
