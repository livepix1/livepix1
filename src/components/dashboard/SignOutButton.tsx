"use client";

import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={cn(
        "w-full rounded-lg px-3 py-2.5 text-left text-sm text-pixflow-slate/60 transition-colors hover:bg-white/5 hover:text-pixflow-magenta",
        className
      )}
    >
      Sair
    </button>
  );
}
