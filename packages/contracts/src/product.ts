import { z } from "zod";

export const moneySchema = z.object({
  currency: z.literal("USD"),
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

export const productSeedListResponseSchema = z.object({
  apiVersion: z.literal("v1"),
  data: z.array(productSeedSchema)
});

export type Money = z.infer<typeof moneySchema>;
export type ProductSeed = z.infer<typeof productSeedSchema>;
export type ProductSeedListResponse = z.infer<typeof productSeedListResponseSchema>;
