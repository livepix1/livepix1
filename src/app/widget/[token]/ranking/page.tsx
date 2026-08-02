import { RankingClient } from "./ranking-client";

export const metadata = { title: "Widget de ranking" };

/**
 * Widget de ranking — top doadores da transmissão (OBS Browser Source).
 * Fundo transparente; período configurável via ?period=today|week|month|all.
 */
export default function RankingWidgetPage({ params }: { params: { token: string } }) {
  return <RankingClient token={params.token} />;
}
