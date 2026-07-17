import type { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | null | undefined;

/**
 * Converte um Prisma.Decimal (não serializável no boundary server->client)
 * para number. Use SEMPRE antes de passar valores monetários a client components.
 */
export function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

/** Formata um valor numérico em BRL. */
export function formatBRL(value: DecimalLike): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}
