import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { listMediaQueue } from "@/lib/actions/media-requests";
import { MusicaPanel, type MediaQueueItem } from "./musica-panel";

export default async function MusicaWidgetPage() {
  const user = await requireUser();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <>
        <PageHeader title="Pedido de Música" subtitle="Fila de músicas pedidas pelos apoiadores." />
        <Card className="max-w-xl text-center">
          <p className="text-sm text-white/60">
            Crie sua página de criador primeiro para ativar o widget de pedido de música.
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

  const rows = await listMediaQueue("MUSIC");
  const queue: MediaQueueItem[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    thumbnailUrl: r.thumbnailUrl,
    requesterName: r.requesterName,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  const base = process.env.NEXTAUTH_URL || "";
  const widgetUrl = `${base}/widget/${profile.widgetToken}/musica`;
  const remoteBase = `${base}/api/remote/${profile.widgetToken}/media/music`;

  return (
    <>
      <PageHeader
        title="Pedido de Música"
        subtitle="Overlay OBS + fila de músicas pedidas pelos apoiadores."
      />
      <div className="max-w-3xl">
        <MusicaPanel widgetUrl={widgetUrl} remoteBase={remoteBase} queue={queue} />
      </div>
    </>
  );
}
