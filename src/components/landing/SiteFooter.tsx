import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-pixflow-darker">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-white/50">
              Receba pagamentos por PIX com um link simples. Sem maquininha, sem
              burocracia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div className="grid gap-2">
              <span className="mb-1 font-medium text-pixflow-slate">Produto</span>
              <a href="#como-funciona" className="text-white/50 hover:text-pixflow-cyan">Como funciona</a>
              <a href="#receber" className="text-white/50 hover:text-pixflow-cyan">Formas de receber</a>
              <a href="#vantagens" className="text-white/50 hover:text-pixflow-cyan">Vantagens</a>
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
          © {new Date().getFullYear()} PixFlow. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
