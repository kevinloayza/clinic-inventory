import { z } from 'zod';

/** Parámetro de query opcional: una cadena vacía cuenta como "no enviado". */
export const optionalParam = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

export const idParam = z.coerce.number().int().positive();
