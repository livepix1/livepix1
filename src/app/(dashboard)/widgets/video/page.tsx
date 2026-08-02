import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { listMediaQueue } from "@/lib/actions/media-requests";
import { VideoPanel, type MediaQueueItem } from "./video-panel";

export default async function VideoWidgetPage() {
  const user = await requireUser();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <>
        <PageHeader title="Pedido de Vídeo" subtitle="Fila de vídeos pedidos pelos apoiadores." />
        <Card className="max-w-xl text-center">
          <p className="text-sm text-white/60">
            Crie sua página de criador primeiro para ativar o widget de pedido de vídeo.
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

  const rows = await listMediaQueue("VIDEO");
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
  const widgetUrl = `${base}/widget/${profile.widgetToken}/video`;
  const remoteBase = `${base}/api/remote/${profile.widgetToken}/media/video`;

  return (
    <>
      <PageHeader
        title="Pedido de Vídeo"
        subtitle="Overlay OBS + fila de vídeos (YouTube) pedidos pelos apoiadores."
      />
      <div className="max-w-3xl">
        <VideoPanel widgetUrl={widgetUrl} remoteBase={remoteBase} queue={queue} />
      </div>
    </>
  );
}
