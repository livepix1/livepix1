"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/cn";

const ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Minha Página", href: "/configuracoes/pagina" },
  { label: "Alertas", href: "/alertas" },
  { label: "Metas", href: "/metas" },
  { label: "Campanhas", href: "/campanhas" },
  { label: "Assinaturas", href: "/assinaturas" },
  { label: "Moderação", href: "/moderacao" },
  { label: "Verificação", href: "/verificacao" },
  { label: "Meu Link", href: "/meu-link" },
  { label: "Cobranças", href: "/cobrancas" },
  { label: "Extrato", href: "/extrato" },
  { label: "Saques", href: "/saques" },
  { label: "Conexões", href: "/configuracoes/conexoes" },
  { label: "API & Webhooks", href: "/configuracoes/api" },
  { label: "Segurança", href: "/seguranca" },
  { label: "Perfil", href: "/perfil" },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo href="/dashboard" />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors",
                active
                  ? "border-l-pixflow-cyan bg-pixflow-cyan/10 text-pixflow-cyan"
                  : "border-l-transparent text-pixflow-slate/60 hover:bg-white/5 hover:text-pixflow-slate"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </nav>
  );
}
