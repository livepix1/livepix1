import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-pixflow-slate/40">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm text-pixflow-slate/70">{title}</p>
        {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
      </div>
    </div>
  );
}
