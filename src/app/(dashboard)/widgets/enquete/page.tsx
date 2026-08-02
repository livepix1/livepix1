import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CopyLink } from "@/components/dashboard/CopyLink";

export default async function WidgetEnquetePage() {
  const user = await requireUser();

  const [profile, activePoll] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId: user.id } }),
    prisma.poll.findFirst({
      where: { creatorId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const base = process.env.NEXTAUTH_URL || "";
  const widgetUrl = profile ? `${base}/widget/${profile.widgetToken}/enquete` : null;

  return (
    <>
      <PageHeader
        title="Widget de Enquete"
        subtitle="Overlay pro OBS que mostra os votos da sua enquete ao vivo, atualizando a cada 5 segundos."
      />
      <Card accent className="max-w-2xl">
        {!profile ? (
          <p className="text-sm text-white/60">
            Configure sua página em{" "}
            <Link href="/configuracoes/pagina" className="text-pixflow-cyan hover:underline">
              Configurações da Página
            </Link>{" "}
            pra gerar seu link de widget.
          </p>
        ) : (
          <>
            <p className="text-sm text-pixflow-slate">
              Link do widget (adicione no OBS como Browser Source, fundo transparente):
            </p>
            {widgetUrl && <CopyLink url={widgetUrl} />}

            {!activePoll ? (
              <p className="mt-4 text-sm text-white/60">
                Nenhuma enquete ativa agora — o widget fica invisível no OBS até você
                ativar uma em{" "}
                <Link href="/enquetes" className="text-pixflow-cyan hover:underline">
                  Enquetes
                </Link>
                .
              </p>
            ) : (
              <p className="mt-4 text-sm text-white/60">
                Enquete ativa agora:{" "}
                <span className="text-white/90">{activePoll.question}</span>
              </p>
            )}
          </>
        )}
      </Card>
    </>
  );
}
