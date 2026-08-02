import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { MaratonaPanel } from "./maratona-panel";

export default async function MaratonaWidgetPage() {
  const user = await requireUser();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <>
        <PageHeader
          title="Widget de Maratona"
          subtitle="Cronômetro que sobe de tempo a cada doação."
        />
        <Card className="max-w-xl text-center">
          <p className="text-sm text-white/60">
            Crie sua página de criador primeiro para ativar o widget de maratona.
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

  const config = await prisma.marathonConfig.findUnique({
    where: { creatorId: user.id },
  });

  const base = process.env.NEXTAUTH_URL || "";
  const widgetUrl = `${base}/widget/${profile.widgetToken}/maratona`;

  return (
    <>
      <PageHeader
        title="Widget de Maratona"
        subtitle="Cronômetro que aparece como overlay no OBS e sobe de tempo a cada doação."
      />
      <div className="max-w-2xl">
        <MaratonaPanel
          widgetUrl={widgetUrl}
          initial={{
            isActive: config?.isActive ?? false,
            secondsPerReal: config?.secondsPerReal ?? 60,
            maxSeconds: config?.maxSeconds ?? null,
            remainingSeconds: config?.remainingSeconds ?? 0,
          }}
        />
      </div>
    </>
  );
}
