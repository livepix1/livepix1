"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const NAV = [
  { label: "Recursos", href: "#recursos" },
  { label: "Taxas", href: "#comparativo" },
  { label: "Modo autônomo", href: "#autonomo" },
  { label: "FAQ", href: "#faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-pixflow-dark/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-pixflow-slate/70 transition-colors hover:text-pixflow-cyan"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/signup">
            <Button>Criar conta</Button>
          </Link>
        </div>

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={cn(
              "h-0.5 w-6 bg-pixflow-slate transition-transform",
              open && "translate-y-2 rotate-45"
            )}
          />
          <span className={cn("h-0.5 w-6 bg-pixflow-slate transition-opacity", open && "opacity-0")} />
          <span
            className={cn(
              "h-0.5 w-6 bg-pixflow-slate transition-transform",
              open && "-translate-y-2 -rotate-45"
            )}
          />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-pixflow-darker px-4 py-4 md:hidden">
          <nav className="grid gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-pixflow-slate/80 hover:bg-white/5"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid gap-2">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="outline" fullWidth>
                Entrar
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)}>
              <Button fullWidth>Criar conta</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
