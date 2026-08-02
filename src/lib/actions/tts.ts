"use server";

import { listElevenLabsVoices, type ElevenLabsVoice } from "@/lib/tts-providers";

/**
 * Lista as vozes ElevenLabs disponíveis pro seletor de voz do dashboard.
 * Sem sessão exigida — é só uma lista pública de vozes, não dado sensível.
 * Retorna [] se o provider não estiver configurado.
 */
export async function listAvailableVoices(): Promise<ElevenLabsVoice[]> {
  return listElevenLabsVoices();
}
