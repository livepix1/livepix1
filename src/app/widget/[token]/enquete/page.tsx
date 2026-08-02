import { EnqueteClient } from "./enquete-client";

export const metadata = { title: "Widget de enquete" };

/**
 * Widget de enquete ao vivo — adicionar no OBS como Browser Source.
 * Fundo transparente; some sozinho quando não há enquete ativa.
 */
export default function WidgetEnquetePage({ params }: { params: { token: string } }) {
  return <EnqueteClient token={params.token} />;
}
