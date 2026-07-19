import { WidgetClient } from "./widget-client";

export const metadata = { title: "Widget de alertas" };

/**
 * Widget de alertas — adicionar no OBS como Browser Source (800×600).
 * Fundo transparente; um alerta por vez com som + TTS.
 */
export default function WidgetPage({ params }: { params: { token: string } }) {
  return <WidgetClient token={params.token} />;
}
