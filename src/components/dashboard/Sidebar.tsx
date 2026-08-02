"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  Bell,
  Target,
  Megaphone,
  BarChart3,
  Repeat,
  ShieldCheck,
  Link as LinkIcon,
  Receipt,
  ScrollText,
  Wallet,
  Share2,
  Webhook,
  KeyRound,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Painel",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Minha Página", href: "/configuracoes/pagina", icon: UserRound },
    ],
  },
  {
    title: "Monetização",
    items: [
      { label: "Alertas", href: "/alertas", icon: Bell },
      { label: "Metas", href: "/metas", icon: Target },
      { label: "Campanhas", href: "/campanhas", icon: Megaphone },
      { label: "Enquetes", href: "/enquetes", icon: BarChart3, badge: "Novo" },
      { label: "Assinaturas", href: "/assinaturas", icon: Repeat },
      { label: "Moderação", href: "/moderacao", icon: ShieldAlert },
    ],
  },
  {
    title: "Modo autônomo",
    items: [
      { label: "Meu Link", href: "/meu-link", icon: LinkIcon },
      { label: "Cobranças", href: "/cobrancas", icon: Receipt },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { label: "Extrato", href: "/extrato", icon: ScrollText },
      { label: "Saques", href: "/saques", icon: Wallet },
      { label: "Verificação", href: "/verificacao", icon: ShieldCheck },
    ],
  },
  {
    title: "Integrações",
    items: [
      { label: "Conexões", href: "/configuracoes/conexoes", icon: Share2 },
      { label: "API & Webhooks", href: "/configuracoes/api", icon: Webhook },
    ],
  },
  {
    title: "Conta",
    items: [
      { label: "Segurança", href: "/seguranca", icon: KeyRound },
      { label: "Perfil", href: "/perfil", icon: UserRound },
    ],
  },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo href="/dashboard" />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/30">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "border-l-pixflow-cyan bg-pixflow-cyan/10 text-pixflow-cyan"
                        : "border-l-transparent text-pixflow-slate/60 hover:bg-white/5 hover:text-pixflow-slate"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 flex-none items-center justify-center rounded-md transition-colors",
                        active
                          ? "bg-pixflow-cyan/15 text-pixflow-cyan"
                          : "bg-white/5 text-pixflow-slate/50 group-hover:text-pixflow-slate"
                      )}
                    >
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto flex-none rounded-full bg-pixflow-magenta/15 px-1.5 py-0.5 text-[10px] font-medium text-pixflow-magenta">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </nav>
  );
}
