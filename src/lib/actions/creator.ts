"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { creatorProfileSchema } from "@/lib/validators";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function newWidgetToken(): string {
  return randomBytes(32).toString("hex");
}

/** Cria/atualiza o perfil público do criador (gera widgetToken no primeiro save). */
export async function saveCreatorProfile(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = creatorProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  const data = {
    displayName: parsed.data.displayName.trim(),
    bio: parsed.data.bio?.trim() || null,
    bannerUrl: parsed.data.bannerUrl?.trim() || null,
    minDonation: new Prisma.Decimal(parsed.data.minDonation),
    maxMessageLen: parsed.data.maxMessageLen,
    isPublic: parsed.data.isPublic,
    allowVideoRequests: parsed.data.allowVideoRequests,
    allowMusicRequests: parsed.data.allowMusicRequests,
  };

  await prisma.creatorProfile.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId, widgetToken: newWidgetToken() },
  });

  revalidatePath("/configuracoes/pagina");
  return { ok: true, message: "Página salva" };
}

/** Regenera o token do widget (invalida a URL antiga do OBS). */
export async function regenerateWidgetToken(): Promise<ActionResult> {
  const session = await requireSession();
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { ok: false, error: "Crie sua página primeiro" };

  await prisma.creatorProfile.update({
    where: { userId: session.user.id },
    data: { widgetToken: newWidgetToken() },
  });
  revalidatePath("/alertas");
  return { ok: true, message: "Token regenerado — atualize a URL no OBS" };
}
