import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { confirmWithdrawal } from "@/lib/actions/dashboard";

export default async function ConfirmWithdrawalPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await confirmWithdrawal(params.token);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card accent className="p-6 text-center">
          {result.ok ? (
            <>
              <p className="mb-1 text-lg font-medium text-emerald-400">
                Saque confirmado
              </p>
              <p className="text-sm text-white/60">
                Seu saque entra como pendente até ser processado.
              </p>
            </>
          ) : (
            <>
              <p className="mb-1 text-lg font-medium text-pixflow-magenta">
                Não foi possível confirmar
              </p>
              <p className="text-sm text-white/60">{result.error}</p>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
