/**
 * Provider de TTS avançado (ElevenLabs) — vozes PT-BR de alta qualidade.
 *
 * INERTE POR PADRÃO: mesmo padrão de `src/lib/asaas-client.ts` / `src/lib/media-upload.ts`.
 * Sem ELEVENLABS_API_KEY configurada, nenhuma função aqui lança erro — apenas
 * devolve null/lista vazia. O widget cai pro Web Speech API do navegador
 * (voz `ttsVoice` já existente) como fallback.
 */

const BASE_URL = "https://api.elevenlabs.io/v1";
const MAX_TEXT_LENGTH = 500;

export function isElevenLabsConfigured(): boolean {
  const key = process.env.ELEVENLABS_API_KEY;
  return Boolean(key && key.trim() && !key.includes("placeholder"));
}

export interface ElevenLabsVoice {
  id: string;
  name: string;
  previewUrl?: string;
}

/** Lista as vozes disponíveis na conta ElevenLabs. Nunca lança — retorna [] se falhar. */
export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  if (!isElevenLabsConfigured()) return [];

  try {
    const res = await fetch(`${BASE_URL}/voices`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY as string },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json().catch(() => null)) as {
      voices?: { voice_id: string; name: string; preview_url?: string }[];
    } | null;

    return (data?.voices ?? []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      previewUrl: v.preview_url,
    }));
  } catch {
    return [];
  }
}

/**
 * Sintetiza `text` na voz `voiceId` e retorna o áudio mp3 como Buffer.
 * Retorna `null` se não configurado ou se a chamada falhar — best-effort,
 * o widget usa Web Speech API como fallback nesse caso.
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string
): Promise<Buffer | null> {
  if (!isElevenLabsConfigured()) return null;

  try {
    const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY as string,
      },
      body: JSON.stringify({
        text: text.slice(0, MAX_TEXT_LENGTH),
        model_id: "eleven_multilingual_v2",
      }),
    });
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
