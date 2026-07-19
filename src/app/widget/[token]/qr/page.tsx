import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QrClient } from "./qr-client";

/** Overlay de QR (Browser Source) — QR da página pública do criador. */
export default async function WidgetQrPage({
  params,
}: {
  params: { token: string };
}) {
  const profile = await prisma.creatorProfile.findUnique({
    where: { widgetToken: params.token },
    include: { user: { select: { username: true } } },
  });
  if (!profile?.user.username) notFound();

  const base = process.env.NEXTAUTH_URL || "";
  const url = `${base}/c/${profile.user.username}`;

  return <QrClient url={url} label={`Apoie: /c/${profile.user.username}`} />;
}
