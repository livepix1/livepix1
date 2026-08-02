import { Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getBalance } from "@/lib/finance";
import { formatBRL, toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { WithdrawalForm } from "./withdrawal-form";

export default async function SaquesPage() {
  const user = await requireUser();
  const [balance, withdrawals] = await Promise.all([
    getBalance(user.id),
    prisma.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Saques"
        subtitle="Transfira seu saldo para uma chave PIX ou conta bancária."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card accent>
          <WithdrawalForm balance={balance} totpEnabled={user.totpEnabled} />
        </Card>

        <Card>
          <p className="mb-4 font-medium text-pixflow-slate">Histórico de saques</p>
          {withdrawals.length === 0 ? (
            <EmptyState icon={Wallet} title="Você ainda não fez saques" />
          ) : (
            <div className="divide-y divide-white/5">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-pixflow-slate">
                      {formatBRL(toNumber(w.amount))}
                    </p>
                    <p className="text-xs text-white/40">
                      {w.createdAt.toLocaleDateString("pt-BR")} ·{" "}
                      {w.destinationType === "PIX" ? "PIX" : "Conta bancária"}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
