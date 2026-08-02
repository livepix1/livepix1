import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts-providers";

/**
 * TTS avançado (ElevenLabs) — GET público, consumido só pelo widget do próprio
 * token. Sem ELEVENLABS_API_KEY configurada (ou se a síntese falhar), devolve
 * 204 — o widget cai pro Web Speech API do navegador como fallback.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const voiceId = searchParams.get("voiceId");

  if (!text || !voiceId) {
    return NextResponse.json(
      { error: "text e voiceId são obrigatórios" },
      { status: 400 }
    );
  }

  const audio = await synthesizeSpeech(text, voiceId);
  if (!audio) {
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(new Uint8Array(audio), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
