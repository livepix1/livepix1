import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/serialize";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfilePageForm } from "./profile-page-form";

export default async function ConfiguracoesPaginaPage() {
  const user = await requireUser();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  const base = process.env.NEXTAUTH_URL || "";
  const publicUrl = user.username && profile ? `${base}/c/${user.username}` : null;

  const initial = profile
    ? {
        displayName: profile.displayName,
        bio: profile.bio ?? "",
        bannerUrl: profile.bannerUrl ?? "",
        minDonation: String(toNumber(profile.minDonation)),
        maxMessageLen: String(profile.maxMessageLen),
        isPublic: profile.isPublic,
        allowVideoRequests: profile.allowVideoRequests,
        allowMusicRequests: profile.allowMusicRequests,
      }
    : null;

  return (
    <>
      <PageHeader
        title="Minha Página"
        subtitle="A página pública onde seu público te apoia com PIX + alerta na live."
      />
      <Card accent className="max-w-2xl">
        <ProfilePageForm
          initial={initial}
          publicUrl={publicUrl}
          usernameMissing={!user.username}
        />
      </Card>
    </>
  );
}
