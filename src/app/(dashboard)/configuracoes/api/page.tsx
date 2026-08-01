import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ApiPanel, type ApiKeyRow, type WebhookRow } from "./api-panel";

export default async function ApiSettingsPage() {
  const user = await requireUser();
  const [keys, webhooks] = await Promise.all([
    prisma.apiKey.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.webhookEndpoint.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const keyRows: ApiKeyRow[] = keys.map((k) => ({
    id: k.id,
    name: k.name,
    scopes: k.scopes,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
  }));
  const webhookRows: WebhookRow[] = webhooks.map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events,
    isActive: w.isActive,
  }));

  return (
    <>
      <PageHeader
        title="API & Webhooks"
        subtitle="Integre sua conta com outras ferramentas via API pública ou webhooks assinados."
      />
      <div className="max-w-2xl">
        <ApiPanel keys={keyRows} webhooks={webhookRows} />
      </div>
    </>
  );
}
