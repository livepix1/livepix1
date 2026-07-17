import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adiciona a borda-esquerda cyan característica do painel. */
  accent?: boolean;
}

export function Card({ children, className, accent }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-pixflow-darker/50 p-5 backdrop-blur-sm",
        accent && "border-l-2 border-l-pixflow-cyan",
        className
      )}
    >
      {children}
    </div>
  );
}
