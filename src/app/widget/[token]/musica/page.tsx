import { MusicaWidgetClient } from "./musica-client";

export const metadata = { title: "Widget de pedido de música" };

/**
 * Widget de pedido de música — adicionar no OBS como Browser Source.
 * Fundo transparente; lista visual (sem player embutido) do pedido atual +
 * fila. O criador toca a música manualmente noutro app.
 */
export default function MusicaWidgetPage({ params }: { params: { token: string } }) {
  return <MusicaWidgetClient token={params.token} />;
}
