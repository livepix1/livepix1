import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getBalance } from "@/lib/finance";
import { formatBRL, toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CopyLink } from "@/components/dashboard/CopyLink";

export default async function DashboardHome() {
  const user = await requireUser();

  const [balance, paidAgg, paidCount, pendingCount, link, recent] =
    await Promise.all([
      getBalance(user.id),
      prisma.charge.aggregate({
        where: { userId: user.id, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.charge.count({ where: { userId: user.id, status: "PAID" } }),
      prisma.charge.count({ where: { userId: user.id, status: "PENDING" } }),
      prisma.paymentLink.findFirst({ where: { userId: user.id } }),
      prisma.charge.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const base = process.env.NEXTAUTH_URL || "";
  const publicLink =
    user.username && link ? `${base}/pay/${user.username}/${link.id}` : null;

  return (
    <>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]} 👋`}
        subtitle="Aqui está um resumo da sua conta."
      />

      {/* Saldo */}
      <Card accent className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-white/50">Saldo disponível</p>
          <p className="mt-1 font-display text-4xl text-pixflow-slate">
            {formatBRL(balance)}
          </p>
        </div>
        <Link href="/saques">
          <Button>Sacar</Button>
        </Link>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-white/50">Total recebido</p>
          <p className="mt-1 font-display text-2xl text-pixflow-slate">
            {formatBRL(paidAgg._sum.amount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-white/50">Cobranças pagas</p>
          <p className="mt-1 font-display text-2xl text-pixflow-slate">{paidCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-white/50">Pendentes</p>
          <p className="mt-1 font-display text-2xl text-pixflow-slate">
            {pendingCount}
          </p>
        </Card>
      </div>

      {/* Seu link */}
      <Card className="mb-6">
        <p className="text-sm text-white/50">Seu link de pagamento</p>
        {publicLink ? (
          <CopyLink url={publicLink} />
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-pixflow-slate/70">
              {!user.username
                ? "Defina um nome de usuário no perfil para ativar seu link."
                : "Você ainda não criou um link de pagamento."}
            </p>
            <Link href={!user.username ? "/perfil" : "/meu-link"}>
              <Button variant="outline">
                {!user.username ? "Definir usuário" : "Criar link"}
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Últimas cobranças */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-medium text-pixflow-slate">Últimas cobranças</p>
          <Link href="/cobrancas" className="text-sm text-pixflow-cyan hover:text-pixflow-magenta">
            Ver todas
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">
            Nenhuma cobrança ainda.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-pixflow-slate">{c.payerName}</p>
                  <p className="text-xs text-white/40">
                    {c.createdAt.toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-pixflow-slate">
                    {formatBRL(toNumber(c.amount))}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
