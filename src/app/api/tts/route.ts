import { NextResponse } from "next/server";

/**
 * TTS premium (OpenAI) — INERTE sem OPENAI_API_KEY.
 * O widget usa Web Speech API como base; quando esta rota estiver ativa,
 * pode trocar para vozes de IA naturais. Retorna áudio mp3.
 */
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.includes("placeholder")) {
    return NextResponse.json(
      { error: "TTS de IA não configurado — usando voz do navegador.", configured: false },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    text?: string;
    voice?: string;
  } | null;
  const text = body?.text?.slice(0, 500);
  if (!text) {
    return NextResponse.json({ error: "text obrigatório" }, { status: 400 });
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: body?.voice ?? "nova",
      input: text,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erro no TTS" }, { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
