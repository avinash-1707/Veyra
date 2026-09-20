import { z } from "zod";

import { apiSuccessSchema } from "./api.js";
import { productSummarySchema, searchFiltersSchema } from "./discovery.js";
import { productFactsheetSchema } from "./evaluation-cart.js";

export const intelligenceSchemaVersion = z.literal(1);
export const intentSchema = z.object({
  schemaVersion: intelligenceSchemaVersion,
  originalQuery: z.string().min(1).max(200),
  filters: searchFiltersSchema,
  requiredAttributes: z.array(z.string().min(1)).max(8),
  preferences: z.array(z.string().min(1)).max(8),
  uncertainty: z.array(z.string().min(1)).max(8),
  source: z.literal("deterministic_fallback")
});
export const evidenceSchema = z.object({ id: z.string().uuid(), type: z.enum(["product", "offer", "review"]), field: z.string().min(1) });
export const rankedProductSchema = z.object({
  product: productSummarySchema,
  reasons: z.array(z.string().min(1)).min(1).max(3),
  tradeoff: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1)
});
export const intelligentSearchSchema = z.object({
  schemaVersion: intelligenceSchemaVersion,
  provider: z.object({ status: z.literal("disabled"), fallback: z.literal("deterministic-baseline") }),
  intent: intentSchema,
  results: z.array(rankedProductSchema),
  total: z.number().int().nonnegative()
});
export const intelligentSearchResponseSchema = apiSuccessSchema(intelligentSearchSchema);
export const comparisonGuidanceSchema = z.object({
  schemaVersion: intelligenceSchemaVersion,
  provider: z.object({ status: z.literal("disabled"), fallback: z.literal("deterministic-baseline") }),
  products: z.array(productFactsheetSchema).min(1).max(3),
  summary: z.string().min(1),
  uncertainties: z.array(z.string().min(1)),
  evidence: z.array(evidenceSchema).min(1)
});
export const reviewGuidanceSchema = z.object({
  schemaVersion: intelligenceSchemaVersion,
  provider: z.object({ status: z.literal("disabled"), fallback: z.literal("deterministic-baseline") }),
  productId: z.string().uuid(),
  reviewCount: z.number().int().nonnegative(),
  summary: z.string().min(1),
  uncertainties: z.array(z.string().min(1)),
  evidence: z.array(evidenceSchema)
});
export const comparisonGuidanceResponseSchema = apiSuccessSchema(comparisonGuidanceSchema);
export const reviewGuidanceResponseSchema = apiSuccessSchema(reviewGuidanceSchema);
export type Intent = z.infer<typeof intentSchema>;
export type IntelligentSearch = z.infer<typeof intelligentSearchSchema>;
export type ComparisonGuidance = z.infer<typeof comparisonGuidanceSchema>;
export type ReviewGuidance = z.infer<typeof reviewGuidanceSchema>;
