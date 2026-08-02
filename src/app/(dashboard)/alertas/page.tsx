import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AlertsPanel, type RecentAlert } from "./alerts-panel";
import { VariationsPanel, type VariationRow, type TemplateRow } from "./variations-panel";
import { listTemplates } from "@/lib/actions/alert-templates";
import { listAvailableVoices } from "@/lib/actions/tts";

export default async function AlertasPage() {
  const user = await requireUser();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <>
        <PageHeader title="Alertas" subtitle="Alertas de doação na sua live." />
        <Card className="max-w-xl text-center">
          <p className="text-sm text-white/60">
            Crie sua página de criador primeiro para ativar o widget de alertas.
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

  const [config, events, variationRows, templateRows, voices] = await Promise.all([
    prisma.alertConfig.findUnique({ where: { creatorId: user.id } }),
    prisma.alertEvent.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.alertVariation.findMany({
      where: { creatorId: user.id },
      orderBy: { priority: "desc" },
    }),
    listTemplates(),
    listAvailableVoices(),
  ]);

  const variations: VariationRow[] = variationRows.map((v) => ({
    id: v.id,
    name: v.name,
    isDefault: v.isDefault,
    priority: v.priority,
    minAmount: v.minAmount ? toNumber(v.minAmount) : null,
    maxAmount: v.maxAmount ? toNumber(v.maxAmount) : null,
    keyword: v.keyword,
    soundUrl: v.soundUrl,
    gifUrl: v.gifUrl,
    durationMs: v.durationMs,
    ttsEnabled: v.ttsEnabled,
    ttsVoice: v.ttsVoice,
    ttsProviderVoiceId: v.ttsProviderVoiceId,
    ttsVolume: v.ttsVolume,
    soundVolume: v.soundVolume,
    readName: v.readName,
    readAmount: v.readAmount,
  }));

  const templates: TemplateRow[] = templateRows.map((t) => ({
    id: t.id,
    name: t.name,
    previewUrl: t.previewUrl,
    soundUrl: t.soundUrl,
    gifUrl: t.gifUrl,
    durationMs: t.durationMs,
    isOfficial: t.isOfficial,
  }));

  const base = process.env.NEXTAUTH_URL || "";
  const widgetUrl = `${base}/widget/${profile.widgetToken}`;
  const qrUrl = `${base}/widget/${profile.widgetToken}/qr`;
  const remoteBase = `${base}/api/remote/${profile.widgetToken}`;

  const recent: RecentAlert[] = events.map((e) => {
    const p = e.payload as {
      payerName?: string;
      grossAmount?: number;
      amount?: number;
      message?: string | null;
    };
    return {
      id: e.id,
      type: e.type,
      payerName: p.payerName ?? "Anônimo",
      amount: p.grossAmount ?? p.amount ?? 0,
      message: p.message ?? null,
      createdAt: e.createdAt.toISOString(),
      displayed: Boolean(e.displayedAt),
    };
  });

  return (
    <>
      <PageHeader
        title="Alertas"
        subtitle="Configure o widget que mostra as doações na sua live."
      />
      <div className="grid max-w-3xl gap-6">
        <VariationsPanel variations={variations} templates={templates} voices={voices} />
        <AlertsPanel
          widgetUrl={widgetUrl}
          qrUrl={qrUrl}
          remoteBase={remoteBase}
          paused={config?.paused ?? false}
          initial={{
            soundUrl: config?.soundUrl ?? "",
            gifUrl: config?.gifUrl ?? "",
            durationMs: String(config?.durationMs ?? 8000),
            ttsEnabled: config?.ttsEnabled ?? true,
            ttsMinAmount: String(toNumber(config?.ttsMinAmount ?? 0)),
            minAlertAmount: String(toNumber(config?.minAlertAmount ?? 0)),
          }}
          recent={recent}
        />
      </div>
    </>
  );
}
