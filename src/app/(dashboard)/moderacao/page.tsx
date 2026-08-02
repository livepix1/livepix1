import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ModerationList, type FlaggedDonation } from "./moderation-list";
import { VoiceModerationList, type PendingVoiceDonation } from "./voice-moderation-list";

export default async function ModeracaoPage() {
  const user = await requireUser();
  const [flagged, pendingVoice] = await Promise.all([
    prisma.donation.findMany({
      where: { creatorId: user.id, moderationStatus: "FLAGGED" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.donation.findMany({
      where: { creatorId: user.id, moderationStatus: "PENDING_VOICE_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const items: FlaggedDonation[] = flagged.map((d) => ({
    id: d.id,
    payerName: d.payerName,
    amount: toNumber(d.amount),
    message: d.message ?? "",
    createdAt: d.createdAt.toISOString(),
  }));

  const voiceItems: PendingVoiceDonation[] = pendingVoice
    .filter((d) => d.mediaUrl && (d.mediaType === "AUDIO" || d.mediaType === "VIDEO"))
    .map((d) => ({
      id: d.id,
      payerName: d.payerName,
      amount: toNumber(d.amount),
      message: d.message ?? "",
      mediaUrl: d.mediaUrl as string,
      mediaType: d.mediaType as "AUDIO" | "VIDEO",
      createdAt: d.createdAt.toISOString(),
    }));

  return (
    <>
      <PageHeader
        title="Moderação"
        subtitle="Mensagens sinalizadas automaticamente ficam ocultas até você revisar."
      />
      <Card className="max-w-2xl">
        <ModerationList items={items} />
      </Card>

      <div className="mt-8 max-w-2xl">
        <h2 className="mb-3 font-display text-lg text-pixflow-slate">
          Mensagens de áudio/vídeo pendentes
        </h2>
        <Card>
          <VoiceModerationList items={voiceItems} />
        </Card>
      </div>
    </>
  );
}
