"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { generateTotpSecret, totpAuthUrl, verifyTotpToken } from "@/lib/totp";
import { encrypt, decrypt } from "@/lib/crypto";
import { BRAND } from "@/lib/brand";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Inicia a ativação do 2FA: gera um segredo novo (ainda NÃO salvo — só confirma
 * e persiste em confirmTotp) e devolve o QR pra escanear no app autenticador.
 * Gerar de novo a cada chamada é intencional: se o usuário abandonar o fluxo,
 * nada fica pendente no banco.
 */
export async function startTotpSetup(): Promise<
  { ok: true; secret: string; qrImage: string } | { ok: false; error: string }
> {
  const session = await requireSession();
  const secret = generateTotpSecret();
  const url = totpAuthUrl(secret, session.user.email ?? "conta", BRAND.name);
  const qrImage = await QRCode.toDataURL(url);
  return { ok: true, secret, qrImage };
}

/** Confirma o código gerado a partir do segredo mostrado no QR e ativa o 2FA. */
export async function confirmTotpSetup(secret: string, code: string): Promise<ActionResult> {
  const session = await requireSession();

  if (!verifyTotpToken(secret, code)) {
    return { ok: false, error: "Código inválido. Confira o horário do seu celular e tente de novo." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecretEnc: encrypt(secret), totpEnabled: true },
  });

  revalidatePath("/seguranca");
  return { ok: true, message: "2FA ativado! Agora todo saque vai exigir o código." };
}

/** Desativa o 2FA — exige um código válido pra provar que ainda é o dono da conta. */
export async function disableTotp(code: string): Promise<ActionResult> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user?.totpEnabled || !user.totpSecretEnc) {
    return { ok: false, error: "2FA não está ativado" };
  }

  const secret = decrypt(user.totpSecretEnc);
  if (!verifyTotpToken(secret, code)) {
    return { ok: false, error: "Código inválido" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecretEnc: null, totpEnabled: false },
  });

  revalidatePath("/seguranca");
  return { ok: true, message: "2FA desativado" };
}
