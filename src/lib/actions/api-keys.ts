"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { generateApiKey } from "@/lib/api-auth";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const apiKeySchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(60),
  scopes: z.array(z.enum(["read", "write", "alerts"])).min(1, "Escolha ao menos um escopo"),
});

/** Cria uma API key nova. A chave em claro só é retornada UMA vez, nesta chamada. */
export async function createApiKey(
  input: unknown
): Promise<{ ok: true; rawKey: string } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  const session = await requireSession();
  const parsed = apiKeySchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  const { raw, hash } = generateApiKey();
  await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name.trim(),
      keyHash: hash,
      scopes: parsed.data.scopes.join(","),
    },
  });

  revalidatePath("/configuracoes/api");
  return { ok: true, rawKey: raw };
}

export async function revokeApiKey(keyId: string): Promise<ActionResult> {
  const session = await requireSession();
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId: session.user.id } });
  if (!key) return { ok: false, error: "Chave não encontrada" };

  await prisma.apiKey.delete({ where: { id: keyId } });
  revalidatePath("/configuracoes/api");
  return { ok: true, message: "Chave revogada" };
}

const webhookSchema = z.object({
  url: z.string().url("URL inválida"),
  events: z.array(z.enum(["payment.new", "alert.new"])).min(1, "Escolha ao menos um evento"),
});

export async function createWebhook(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fe[k]) fe[k] = i.message;
    }
    return { ok: false, error: "Dados inválidos", fieldErrors: fe };
  }

  await prisma.webhookEndpoint.create({
    data: {
      userId: session.user.id,
      url: parsed.data.url,
      secret: randomBytes(24).toString("hex"),
      events: parsed.data.events.join(","),
    },
  });

  revalidatePath("/configuracoes/api");
  return { ok: true, message: "Webhook criado" };
}

export async function toggleWebhook(webhookId: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireSession();
  const hook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, userId: session.user.id },
  });
  if (!hook) return { ok: false, error: "Webhook não encontrado" };

  await prisma.webhookEndpoint.update({ where: { id: webhookId }, data: { isActive } });
  revalidatePath("/configuracoes/api");
  return { ok: true };
}

export async function deleteWebhook(webhookId: string): Promise<ActionResult> {
  const session = await requireSession();
  const hook = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, userId: session.user.id },
  });
  if (!hook) return { ok: false, error: "Webhook não encontrado" };

  await prisma.webhookEndpoint.delete({ where: { id: webhookId } });
  revalidatePath("/configuracoes/api");
  return { ok: true, message: "Webhook removido" };
}
