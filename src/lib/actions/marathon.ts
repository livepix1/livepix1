"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { marathonConfigSchema } from "@/lib/validators/marathon";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Busca a config de Maratona do criador logado, criando com defaults se não existir. */
export async function getOrCreateMarathonConfig() {
  const session = await requireSession();
  return prisma.marathonConfig.upsert({
    where: { creatorId: session.user.id },
    update: {},
    create: { creatorId: session.user.id },
  });
}

/** Atualiza segundos por R$1 e o teto opcional. */
export async function updateMarathonConfig(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = marathonConfigSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  await prisma.marathonConfig.upsert({
    where: { creatorId: session.user.id },
    update: {
      secondsPerReal: parsed.data.secondsPerReal,
      maxSeconds: parsed.data.maxSeconds ?? null,
    },
    create: {
      creatorId: session.user.id,
      secondsPerReal: parsed.data.secondsPerReal,
      maxSeconds: parsed.data.maxSeconds ?? null,
    },
  });

  revalidatePath("/widgets/maratona");
  return { ok: true, message: "Configuração salva" };
}

/** Ativa ou desativa o cronômetro de maratona. */
export async function setMarathonActive(isActive: boolean): Promise<ActionResult> {
  const session = await requireSession();

  await prisma.marathonConfig.upsert({
    where: { creatorId: session.user.id },
    update: { isActive },
    create: { creatorId: session.user.id, isActive },
  });

  revalidatePath("/widgets/maratona");
  return { ok: true, message: isActive ? "Maratona ativada" : "Maratona pausada" };
}

/**
 * Incrementa o relógio da maratona quando uma doação chega.
 * Não é uma server action de dashboard — é chamada internamente por outro
 * código (webhook de pagamento) ainda não conectado. Só soma se a maratona
 * estiver ativa; respeita o teto (`maxSeconds`) se definido.
 */
export async function addMarathonSeconds(creatorId: string, amount: number): Promise<void> {
  const config = await prisma.marathonConfig.findUnique({ where: { creatorId } });
  if (!config || !config.isActive) return;

  const addSeconds = Math.round(amount * config.secondsPerReal);
  if (addSeconds <= 0) return;

  const next = config.remainingSeconds + addSeconds;
  const capped = config.maxSeconds !== null ? Math.min(next, config.maxSeconds) : next;

  await prisma.marathonConfig.update({
    where: { creatorId },
    data: { remainingSeconds: capped },
  });
}

/** Zera o relógio da maratona (botão "Resetar" no painel). */
export async function resetMarathonTimer(): Promise<ActionResult> {
  const session = await requireSession();

  await prisma.marathonConfig.upsert({
    where: { creatorId: session.user.id },
    update: { remainingSeconds: 0 },
    create: { creatorId: session.user.id, remainingSeconds: 0 },
  });

  revalidatePath("/widgets/maratona");
  return { ok: true, message: "Cronômetro zerado" };
}
