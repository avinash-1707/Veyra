import { z } from "zod";

import { apiSuccessSchema } from "./api.js";

export const moneySchema = z.object({
  currency: z.literal("INR"),
  amountMinor: z.number().int().nonnegative()
});

export const productSeedSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  brand: z.string().min(1),
  status: z.literal("published"),
  price: moneySchema,
  availableQuantity: z.number().int().nonnegative()
});

export const productSeedListResponseSchema = apiSuccessSchema(z.array(productSeedSchema));

export type Money = z.infer<typeof moneySchema>;
export type ProductSeed = z.infer<typeof productSeedSchema>;
export type ProductSeedListResponse = z.infer<typeof productSeedListResponseSchema>;
