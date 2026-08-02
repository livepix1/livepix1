import { UltimosClient } from "./ultimos-client";

export const metadata = { title: "Widget de últimos incentivos" };

/**
 * Widget de últimos incentivos — lista de doações/assinaturas recentes (OBS Browser Source).
 * Fundo transparente.
 */
export default function UltimosWidgetPage({ params }: { params: { token: string } }) {
  return <UltimosClient token={params.token} />;
}
