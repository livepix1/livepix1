import Link from "next/link";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-display text-xl", className)}
    >
      <span className="text-gradient-neon">{BRAND.name}</span>
    </Link>
  );
}
