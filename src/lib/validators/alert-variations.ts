import { z } from "zod";

/**
 * Validação de uma variação de alerta (critério + aparência/TTS).
 * Arquivo isolado (não em `src/lib/validators.ts`, que é compartilhado com
 * outros agentes em paralelo).
 */
export const alertVariationSchema = z
  .object({
    name: z.string().min(2, "Nome muito curto").max(40, "Nome muito longo"),
    minAmount: z.coerce.number().positive("Precisa ser positivo").optional(),
    maxAmount: z.coerce.number().positive("Precisa ser positivo").optional(),
    keyword: z.string().min(1).max(40).optional().or(z.literal("")),
    soundUrl: z.string().url().optional().or(z.literal("")),
    gifUrl: z.string().url().optional().or(z.literal("")),
    durationMs: z.coerce.number().int().min(3000).max(30000).optional(),
    ttsEnabled: z.coerce.boolean().optional(),
    ttsVoice: z.string().optional(),
    ttsProviderVoiceId: z.string().optional(),
    ttsVolume: z.coerce.number().int().min(0).max(100).optional(),
    soundVolume: z.coerce.number().int().min(0).max(100).optional(),
    readName: z.coerce.boolean().default(true),
    readAmount: z.coerce.boolean().default(true),
  })
  .refine(
    (data) =>
      data.minAmount === undefined ||
      data.maxAmount === undefined ||
      data.maxAmount >= data.minAmount,
    {
      message: "O valor máximo precisa ser maior ou igual ao mínimo",
      path: ["maxAmount"],
    }
  );

export type AlertVariationInput = z.infer<typeof alertVariationSchema>;
