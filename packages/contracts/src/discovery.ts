import { z } from "zod";

import { apiSuccessSchema, pageInfoSchema } from "./api.js";
import { moneySchema } from "./product.js";

export const deliverySimulationDisclosure =
  "Delivery dates, availability, and shipping charges are simulated estimates, not real-world commitments.";

export const categorySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1)
});

export const offerConditionSchema = z.enum(["new", "open_box"]);
export const availabilitySchema = z.enum(["available", "unavailable", "withdrawn"]);
export const deliverySpeedSchema = z.enum(["standard", "expedited"]);

export const indianAddressSchema = z.object({
  recipientName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pinCode: z.string().regex(/^\d{6}$/)
});

export const deliveryOptionSchema = z.object({
  speed: deliverySpeedSchema,
  shippingPrice: moneySchema,
  minimumBusinessDays: z.number().int().positive(),
  maximumBusinessDays: z.number().int().positive()
});

export const deliveryEstimateSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("address_required"),
    disclosure: z.literal(deliverySimulationDisclosure)
  }),
  z.object({
    status: z.literal("available"),
    disclosure: z.literal(deliverySimulationDisclosure),
    options: z.array(deliveryOptionSchema).min(1)
  }),
  z.object({
    status: z.literal("unavailable"),
    disclosure: z.literal(deliverySimulationDisclosure),
    reason: z.string().min(1)
  })
]);

export const productVariantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  attributes: z.record(z.string(), z.string().min(1))
});

export const productOfferSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  sellerName: z.string().min(1),
  price: moneySchema,
  condition: offerConditionSchema,
  availability: availabilitySchema,
  expeditedEligible: z.boolean()
});

export const productSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  brand: z.string().min(1),
  category: categorySchema,
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  image: z.object({ alt: z.string().min(1), url: z.string().min(1) }),
  selectedVariant: productVariantSchema,
  selectedOffer: productOfferSchema,
  delivery: deliveryEstimateSchema
});

export const productDetailSchema = productSummarySchema.extend({
  description: z.string().min(1),
  specifications: z.record(z.string(), z.string().min(1)),
  variants: z.array(productVariantSchema).min(1),
  offers: z.array(productOfferSchema).min(1)
});

export const searchSortSchema = z.enum(["relevance", "price_asc", "price_desc", "rating_desc"]);
export const searchFiltersSchema = z
  .object({
    category: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    brand: z.string().min(1).optional(),
    minPriceMinor: z.number().int().nonnegative().optional(),
    maxPriceMinor: z.number().int().nonnegative().optional(),
    minRating: z.number().min(0).max(5).optional(),
    availability: z.literal("available").optional()
  })
  .superRefine((value, context) => {
    if (
      value.minPriceMinor !== undefined &&
      value.maxPriceMinor !== undefined &&
      value.minPriceMinor > value.maxPriceMinor
    ) {
      context.addIssue({
        code: "custom",
        message: "minPriceMinor must not exceed maxPriceMinor",
        path: ["minPriceMinor"]
      });
    }
  });

export const searchResponseSchema = z.object({
  query: z.string().max(200),
  sort: searchSortSchema,
  filters: searchFiltersSchema,
  results: z.array(productSummarySchema),
  total: z.number().int().nonnegative(),
  pageInfo: pageInfoSchema
});

export const suggestionSchema = z.object({ type: z.enum(["query", "category"]), value: z.string().min(1) });

export const categoryListResponseSchema = apiSuccessSchema(z.array(categorySchema));
export const searchListResponseSchema = apiSuccessSchema(searchResponseSchema);
export const suggestionsResponseSchema = apiSuccessSchema(z.array(suggestionSchema));
export const productDetailResponseSchema = apiSuccessSchema(productDetailSchema);
export const deliveryEstimateResponseSchema = apiSuccessSchema(deliveryEstimateSchema);

export type Category = z.infer<typeof categorySchema>;
export type IndianAddress = z.infer<typeof indianAddressSchema>;
export type DeliveryEstimate = z.infer<typeof deliveryEstimateSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type ProductOffer = z.infer<typeof productOfferSchema>;
export type ProductSummary = z.infer<typeof productSummarySchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type SearchSort = z.infer<typeof searchSortSchema>;
