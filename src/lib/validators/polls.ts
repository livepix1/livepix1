import { z } from "zod";

/** Enquete: pergunta + 2 a 6 opções. */
export const pollSchema = z.object({
  question: z.string().min(5, "Pergunta muito curta").max(200, "Pergunta muito longa"),
  options: z
    .array(z.string().min(1, "Opção não pode ser vazia").max(80, "Opção muito longa"))
    .min(2, "Mínimo 2 opções")
    .max(6, "Máximo 6 opções"),
});

export type PollInput = z.infer<typeof pollSchema>;
