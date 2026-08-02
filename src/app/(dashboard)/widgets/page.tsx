import Link from "next/link";
import {
  Bell,
  Timer,
  Trophy,
  History,
  Video,
  Music,
  BarChart3,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface WidgetEntry {
  icon: LucideIcon;
  name: string;
  description: string;
  /** Rota do overlay pra colar no OBS (relativa ao token). */
  widgetPath: string;
  /** Página de configuração no painel, quando existe. */
  settingsHref?: string;
}

const WIDGETS: WidgetEntry[] = [
  {
    icon: Bell,
    name: "Alertas",
    description: "Doações na tela com som, GIF e voz. O principal da live.",
    widgetPath: "",
    settingsHref: "/alertas",
  },
  {
    icon: QrCode,
    name: "QR fixo",
    description: "QR code de doação sempre visível num canto da transmissão.",
    widgetPath: "/qr",
    settingsHref: "/alertas",
  },
  {
    icon: Timer,
    name: "Maratona",
    description: "Cronômetro que aumenta a cada doação recebida.",
    widgetPath: "/maratona",
    settingsHref: "/widgets/maratona",
  },
  {
    icon: Trophy,
    name: "Ranking",
    description: "Top apoiadores do período que você escolher.",
    widgetPath: "/ranking",
    settingsHref: "/widgets/ranking-e-recentes",
  },
  {
    icon: History,
    name: "Últimos incentivos",
    description: "Lista das últimas doações e assinaturas recebidas.",
    widgetPath: "/ultimos",
    settingsHref: "/widgets/ranking-e-recentes",
  },
  {
    icon: Video,
    name: "Vídeo",
    description: "Fila de vídeos pedidos pelo público, com controle remoto.",
    widgetPath: "/video",
    settingsHref: "/widgets/video",
  },
  {
    icon: Music,
    name: "Música",
    description: "Fila de músicas pedidas pelo público, com controle remoto.",
    widgetPath: "/musica",
    settingsHref: "/widgets/musica",
  },
  {
    icon: BarChart3,
    name: "Enquete ao vivo",
    description: "Resultado da enquete ativa atualizando em tempo real.",
    widgetPath: "/enquete",
    settingsHref: "/widgets/enquete",
  },
];

export default async function WidgetsPage() {
  const user = await requireUser();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <>
        <PageHeader title="Widgets" subtitle="Overlays pra usar no OBS." />
        <Card className="max-w-xl text-center">
          <p className="text-sm text-white/60">
            Crie sua página de criador primeiro para gerar seus widgets.
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
  const widgetBase = `${base}/widget/${profile.widgetToken}`;

  return (
    <>
      <PageHeader
        title="Widgets"
        subtitle="Cada um é uma URL pra adicionar no OBS como Fonte de Navegador."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {WIDGETS.map((w) => {
          const Icon = w.icon;
          return (
            <Card key={w.name} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pixflow-cyan/15 text-pixflow-cyan">
                    <Icon size={16} />
                  </span>
                  <p className="font-medium text-pixflow-slate">{w.name}</p>
                </div>
                <p className="mt-2 text-sm text-white/50">{w.description}</p>
                <code className="mt-3 block break-all rounded-lg bg-pixflow-dark px-3 py-2 text-xs text-pixflow-cyan">
                  {widgetBase}
                  {w.widgetPath}
                </code>
              </div>
              {w.settingsHref && (
                <div className="mt-4">
                  <Link href={w.settingsHref}>
                    <Button variant="outline">Configurar</Button>
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
