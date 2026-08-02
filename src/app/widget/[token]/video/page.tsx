import { VideoWidgetClient } from "./video-client";

export const metadata = { title: "Widget de pedido de vídeo" };

/**
 * Widget de pedido de vídeo (YouTube) — adicionar no OBS como Browser Source.
 * Fundo transparente; toca o item PLAYING atual num iframe embed.
 */
export default function VideoWidgetPage({ params }: { params: { token: string } }) {
  return <VideoWidgetClient token={params.token} />;
}
