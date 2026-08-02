import { z } from "zod";

/**
 * Validação de um pedido de vídeo/música mandado pelo doador (público, sem login).
 * Arquivo isolado (não em `src/lib/validators.ts`, que é compartilhado com
 * outros agentes em paralelo).
 */
export const mediaRequestSchema = z.object({
  url: z.string().url("Link inválido"),
  kind: z.enum(["VIDEO", "MUSIC"]),
});

export type MediaRequestInput = z.infer<typeof mediaRequestSchema>;
