import { MaratonaClient } from "./maratona-client";

export const metadata = { title: "Widget de Maratona" };

/**
 * Widget de Maratona — overlay OBS que sobe de tempo a cada doação
 * ("cada R$X doado adiciona Y segundos ao relógio"). Adicionar no OBS
 * como Browser Source. Fundo transparente.
 */
export default function MaratonaWidgetPage({ params }: { params: { token: string } }) {
  return <MaratonaClient token={params.token} />;
}
