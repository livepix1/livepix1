import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { VerificationForm } from "./verification-form";

export default async function VerificacaoPage() {
  const user = await requireUser();
  const providerAccount = await prisma.providerAccount.findUnique({
    where: { userId: user.id },
  });

  const status = providerAccount?.kycStatus ?? "NONE";
  const canSubmit = status === "NONE" || status === "REJECTED";

  return (
    <>
      <PageHeader
        title="Verificação"
        subtitle="Cadastre seus dados para receber PIX de verdade — cria sua subconta no Asaas."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card accent>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-medium text-pixflow-slate">Status da verificação</p>
            <StatusBadge status={status} />
          </div>
          {status === "NONE" && (
            <p className="text-sm text-white/50">
              Você ainda não enviou seus dados. Preencha o formulário para começar a receber
              pagamentos reais.
            </p>
          )}
          {status === "PENDING" && (
            <p className="text-sm text-white/50">
              Seus dados foram enviados e estão em análise pelo Asaas. Isso pode levar alguns
              dias — volte aqui para acompanhar.
            </p>
          )}
          {status === "APPROVED" && (
            <p className="text-sm text-emerald-400">
              Sua subconta está aprovada. Suas cobranças e saques já usam split automático.
            </p>
          )}
          {status === "REJECTED" && (
            <p className="text-sm text-pixflow-magenta">
              Sua verificação foi rejeitada pelo Asaas. Revise seus dados e envie novamente.
            </p>
          )}
        </Card>

        <Card>
          {canSubmit ? (
            <VerificationForm />
          ) : (
            <p className="py-10 text-center text-sm text-white/40">
              Nenhuma ação necessária no momento.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
