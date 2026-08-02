"use server";

import { requireSession } from "@/lib/session";
import { uploadAlertSound } from "@/lib/media-upload";

export type AlertSoundUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

// Áudio curto de alerta — 5MB é generoso, não precisa suportar arquivos grandes.
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Recebe o áudio do alerta (gravado ou selecionado no painel) como base64,
 * valida o tamanho e envia pro Supabase Storage via `uploadAlertSound`.
 * Se o storage não estiver configurado (ambiente sem env vars) ou o upload
 * falhar, retorna erro amigável — nunca lança.
 */
export async function uploadAlertSoundAction(
  base64Data: string,
  mimeType: string
): Promise<AlertSoundUploadResult> {
  const session = await requireSession();

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    return { ok: false, error: "Arquivo de áudio inválido." };
  }

  if (buffer.length === 0) {
    return { ok: false, error: "Arquivo de áudio inválido." };
  }

  if (buffer.length > MAX_BYTES) {
    return { ok: false, error: "Áudio muito grande (máximo 5MB)." };
  }

  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  const url = await uploadAlertSound(blob, session.user.id);

  if (!url) {
    return { ok: false, error: "Upload de áudio ainda não está disponível nesta conta." };
  }

  return { ok: true, url };
}
