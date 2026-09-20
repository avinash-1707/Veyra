import { z } from "zod";

import { apiSuccessSchema } from "./api.js";
import { deliverySimulationDisclosure, productDetailSchema, productOfferSchema, productVariantSchema } from "./discovery.js";
import { moneySchema } from "./product.js";

export const productFactsheetSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  brand: z.string().min(1),
  category: z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1) }),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  selectedVariant: productVariantSchema,
  selectedOffer: productOfferSchema,
  specifications: z.record(z.string(), z.string().min(1).nullable())
});

export const compareResponseSchema = apiSuccessSchema(z.object({
  products: z.array(productFactsheetSchema).min(1).max(3),
  fieldOrder: z.array(z.string().min(1))
}));

export const productReviewSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1),
  body: z.string().min(1),
  authorDisplayName: z.string().min(1),
  verifiedPurchase: z.boolean(),
  createdAt: z.string().datetime()
});

export const productQuestionSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  question: z.string().min(1),
  answer: z.string().min(1).nullable(),
  createdAt: z.string().datetime()
});

export const evaluationResponseSchema = apiSuccessSchema(z.object({
  product: productDetailSchema,
  reviews: z.array(productReviewSchema),
  questions: z.array(productQuestionSchema),
  relatedProducts: z.array(productFactsheetSchema)
}));

export const cartItemLocationSchema = z.enum(["cart", "saved_for_later"]);
export const cartLineSchema = z.object({
  id: z.string().min(1),
  product: productFactsheetSchema,
  quantity: z.number().int().positive(),
  location: cartItemLocationSchema,
  lineSubtotal: moneySchema,
  lineDiscount: moneySchema,
  availabilityStatus: z.enum(["ok", "offer_unavailable", "offer_changed"])
});

export const cartTotalsSchema = z.object({
  currency: z.literal("INR"),
  itemSubtotal: moneySchema,
  discountTotal: moneySchema,
  shipping: moneySchema,
  estimatedTax: moneySchema,
  grandTotal: moneySchema,
  disclosure: z.literal(deliverySimulationDisclosure)
});

export const cartSchema = z.object({
  id: z.string().min(1),
  items: z.array(cartLineSchema),
  savedForLater: z.array(cartLineSchema),
  totals: cartTotalsSchema,
  itemCount: z.number().int().nonnegative()
});

export const addCartItemCommandSchema = z.object({
  offerId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(10).default(1)
});
export const updateCartItemCommandSchema = z.object({ quantity: z.number().int().positive().max(10) });
export const cartResponseSchema = apiSuccessSchema(cartSchema);

export type ProductFactsheet = z.infer<typeof productFactsheetSchema>;
export type ProductReview = z.infer<typeof productReviewSchema>;
export type ProductQuestion = z.infer<typeof productQuestionSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type AddCartItemCommand = z.infer<typeof addCartItemCommandSchema>;
export type UpdateCartItemCommand = z.infer<typeof updateCartItemCommandSchema>;
