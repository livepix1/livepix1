/**
 * Upload de mídia do doador (áudio/vídeo) pro Supabase Storage — bucket "donation-media".
 * Mesmo padrão INERTE de `src/lib/realtime.ts`: sem as env vars configuradas,
 * nunca lança erro, apenas devolve null (o formulário público segue funcionando
 * sem anexar mídia).
 */

export function isMediaUploadConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
}

const BUCKET = "donation-media";

/**
 * Envia o blob de mídia (áudio/vídeo) pro bucket do Supabase Storage via REST.
 * Retorna a URL pública ou `null` se o storage não estiver configurado ou o
 * upload falhar — nunca lança, para não derrubar o fluxo de doação.
 */
export async function uploadDonationMedia(
  file: Blob,
  donationId: string
): Promise<string | null> {
  if (!isMediaUploadConfigured()) return null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const ext = file.type.includes("webm")
      ? "webm"
      : file.type.includes("mp4")
        ? "mp4"
        : file.type.includes("ogg")
          ? "ogg"
          : "bin";
    const objectPath = `${donationId}.${ext}`;

    const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: Buffer.from(await file.arrayBuffer()),
      cache: "no-store",
    });

    if (!res.ok) return null;

    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  } catch {
    return null; // best-effort — a doação já foi criada, só a mídia não anexou
  }
}
