import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-pixflow-darker">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-white/50">{BRAND.tagline}.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div className="grid gap-2">
              <span className="mb-1 font-medium text-pixflow-slate">Produto</span>
              <a href="#recursos" className="text-white/50 hover:text-pixflow-cyan">Recursos</a>
              <a href="#comparativo" className="text-white/50 hover:text-pixflow-cyan">Taxas</a>
              <a href="#autonomo" className="text-white/50 hover:text-pixflow-cyan">Modo autônomo</a>
            </div>
            <div className="grid gap-2">
              <span className="mb-1 font-medium text-pixflow-slate">Conta</span>
              <Link href="/login" className="text-white/50 hover:text-pixflow-cyan">Entrar</Link>
              <Link href="/signup" className="text-white/50 hover:text-pixflow-cyan">Criar conta</Link>
            </div>
            <div className="grid gap-2">
              <span className="mb-1 font-medium text-pixflow-slate">Legal</span>
              <span className="cursor-not-allowed text-white/30">Termos</span>
              <span className="cursor-not-allowed text-white/30">Privacidade</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} {BRAND.name}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
