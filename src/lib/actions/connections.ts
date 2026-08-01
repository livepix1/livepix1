"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { OAuthProviderId } from "@/lib/oauth/providers";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function disconnectProvider(provider: OAuthProviderId): Promise<ActionResult> {
  const session = await requireSession();
  await prisma.socialConnection.deleteMany({
    where: { userId: session.user.id, provider },
  });
  revalidatePath("/configuracoes/conexoes");
  return { ok: true };
}
