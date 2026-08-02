import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WidgetsLinksPanel } from "./widgets-links-panel";

export default async function RankingERecentesPage() {
  const user = await requireUser();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <>
        <PageHeader
          title="Widgets — Ranking e Últimos Incentivos"
          subtitle="Overlays para adicionar na sua live."
        />
        <Card className="max-w-xl text-center">
          <p className="text-sm text-white/60">
            Crie sua página de criador primeiro para ativar estes widgets.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/configuracoes/pagina">
              <Button>Criar minha página</Button>
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const base = process.env.NEXTAUTH_URL || "";
  const rankingBaseUrl = `${base}/widget/${profile.widgetToken}/ranking`;
  const ultimosUrl = `${base}/widget/${profile.widgetToken}/ultimos`;

  return (
    <>
      <PageHeader
        title="Widgets — Ranking e Últimos Incentivos"
        subtitle="Adicione estes overlays no OBS como Browser Source. Fundo transparente."
      />
      <div className="grid max-w-2xl gap-6">
        <WidgetsLinksPanel rankingBaseUrl={rankingBaseUrl} ultimosUrl={ultimosUrl} />
      </div>
    </>
  );
}
