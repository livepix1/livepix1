import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-display text-xl", className)}
    >
      <span className="text-gradient-neon">Pix</span>
      <span className="text-pixflow-slate">Flow</span>
    </Link>
  );
}
