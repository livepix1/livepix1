import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(80),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres").max(72),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const paymentLinkSchema = z.object({
  linkType: z.enum(["VALOR_FIXO", "DOACAO", "CONSULTORIA"]),
  title: z.string().min(3, "Título muito curto").max(120),
  description: z.string().max(500, "Máximo de 500 caracteres").optional().or(z.literal("")),
  value: z
    .union([z.coerce.number().positive("O valor precisa ser positivo"), z.nan()])
    .optional(),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});
export type PaymentLinkInput = z.infer<typeof paymentLinkSchema>;

// Chave PIX: email, telefone, CPF, CNPJ ou chave aleatória (uuid).
const pixKeyRegex =
  /^(?:[^@\s]+@[^@\s]+\.[^@\s]+|\+?\d{10,14}|\d{11}|\d{14}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

export const withdrawalSchema = z
  .object({
    amount: z.coerce.number().min(1, "Valor mínimo de R$ 1,00"),
    destinationType: z.enum(["PIX", "BANK"]),
    destinationPixKey: z.string().optional().or(z.literal("")),
    destinationBank: z.string().optional().or(z.literal("")),
    destinationAgency: z.string().optional().or(z.literal("")),
    destinationAccount: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      d.destinationType !== "PIX" ||
      (d.destinationPixKey && pixKeyRegex.test(d.destinationPixKey)),
    { message: "Chave PIX inválida", path: ["destinationPixKey"] }
  )
  .refine(
    (d) =>
      d.destinationType !== "BANK" ||
      (d.destinationBank && d.destinationAgency && d.destinationAccount),
    { message: "Preencha banco, agência e conta", path: ["destinationBank"] }
  );
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;

/** Usernames proibidos — colidiriam com rotas do app. */
export const RESERVED_USERNAMES = new Set([
  "login", "signup", "logout", "dashboard", "api", "pay", "widget", "admin",
  "meu-link", "cobrancas", "saques", "perfil", "extrato", "metas", "alertas",
  "assinaturas", "moderacao", "configuracoes", "verificacao", "analytics",
  "c", "campanhas", "app", "www", "suporte", "ajuda", "termos", "privacidade",
  "sobre", "precos", "taxas", "blog", "docs", "static", "_next", "favicon.ico",
]);

export const profileSchema = z.object({
  name: z.string().min(2).max(80),
  username: z
    .string()
    .min(3, "Mínimo de 3 caracteres")
    .max(30)
    .regex(/^[a-z0-9_.-]+$/, "Use só letras minúsculas, números, . _ -")
    .refine((u) => !RESERVED_USERNAMES.has(u), "Esse nome de usuário não está disponível")
    .optional()
    .or(z.literal("")),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve ter 11 dígitos (só números)")
    .optional()
    .or(z.literal("")),
  accountType: z.enum(["PF", "CNPJ"]),
  pixKey: z.string().optional().or(z.literal("")),
  avatar: z.string().url("URL inválida").optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// Perfil público do criador (página /[username]).
export const creatorProfileSchema = z.object({
  displayName: z.string().min(2, "Nome muito curto").max(60),
  bio: z.string().max(300, "Máximo de 300 caracteres").optional().or(z.literal("")),
  bannerUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  minDonation: z.coerce.number().min(1, "Mínimo de R$ 1,00").max(1000),
  maxMessageLen: z.coerce.number().int().min(50).max(400),
  isPublic: z.coerce.boolean(),
});
export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;

// Doação na página pública do criador.
export const donationSchema = z.object({
  payerName: z.string().max(60).optional().or(z.literal("")),
  payerEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  message: z.string().max(400).optional().or(z.literal("")),
  amount: z.coerce.number().positive("Valor inválido").max(50000),
  goalId: z.string().optional(),
});
export type DonationInput = z.infer<typeof donationSchema>;

// Dados do pagador na página pública de pagamento.
export const payerSchema = z.object({
  payerName: z.string().min(2, "Informe seu nome").max(80),
  payerEmail: z.string().email("Email inválido"),
  payerMessage: z.string().max(280).optional().or(z.literal("")),
  amount: z.coerce.number().positive("Valor inválido"),
});
export type PayerInput = z.infer<typeof payerSchema>;
