import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Logo className="text-2xl" />
          <h1 className="mt-6 text-2xl">Crie sua conta</h1>
          <p className="mt-1 text-sm text-white/50">
            Comece a receber pagamentos por um link em minutos
          </p>
        </div>

        <Card accent className="p-6">
          <OAuthButtons />

          <div className="my-5 flex items-center gap-3 text-xs text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            ou com email
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <SignupForm />
        </Card>

        <p className="mt-6 text-center text-sm text-white/50">
          Já tem conta?{" "}
          <Link href="/login" className="text-pixflow-cyan hover:text-pixflow-magenta">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
