import { z } from "zod";

/**
 * Validação do Widget de Maratona (P1).
 * Arquivo isolado (não em `src/lib/validators.ts`, que é compartilhado com
 * outros agentes em paralelo).
 */
export const marathonConfigSchema = z.object({
  secondsPerReal: z.coerce
    .number()
    .int("Precisa ser um número inteiro")
    .min(1, "Mínimo de 1 segundo por R$1")
    .max(3600, "Máximo de 3600 segundos (1h) por R$1"),
  maxSeconds: z
    .union([
      z.coerce
        .number()
        .int("Precisa ser um número inteiro")
        .positive("Precisa ser positivo"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
});
export type MarathonConfigInput = z.infer<typeof marathonConfigSchema>;
