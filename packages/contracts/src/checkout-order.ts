import { z } from "zod";

import { apiSuccessSchema, paginatedSchema } from "./api.js";
import { cartTotalsSchema } from "./evaluation-cart.js";
import { deliverySpeedSchema, indianAddressSchema } from "./discovery.js";
import { moneySchema } from "./product.js";

export const mockPaymentMethodSchema = z.enum(["mock_success", "mock_failure"]);
export const checkoutQuoteCommandSchema = z.object({
  cartId: z.string().min(1).max(120).optional(),
  shippingAddress: indianAddressSchema,
  deliverySpeed: deliverySpeedSchema.default("standard"),
  mockPaymentMethod: mockPaymentMethodSchema.default("mock_success")
});

export const checkoutQuoteLineSchema = z.object({
  cartLineId: z.string().min(1),
  productId: z.string().uuid(),
  productSlug: z.string().min(1),
  productTitle: z.string().min(1),
  variantId: z.string().uuid(),
  variantName: z.string().min(1),
  offerId: z.string().uuid(),
  sellerName: z.string().min(1),
  unitPrice: moneySchema,
  quantity: z.number().int().positive(),
  lineSubtotal: moneySchema,
  lineDiscount: moneySchema
});

export const checkoutQuoteSchema = z.object({
  id: z.string().uuid(),
  shopperId: z.string().min(1),
  cartId: z.string().min(1),
  expiresAt: z.string().datetime(),
  shippingAddress: indianAddressSchema,
  deliverySpeed: deliverySpeedSchema,
  mockPaymentMethod: mockPaymentMethodSchema,
  lines: z.array(checkoutQuoteLineSchema).min(1),
  totals: cartTotalsSchema
});

export const checkoutConfirmCommandSchema = z.object({
  quoteId: z.string().uuid(),
  mockPaymentMethod: mockPaymentMethodSchema.default("mock_success")
});

export const orderStatusSchema = z.enum(["confirmed", "preparing", "shipped", "delivered", "cancelled"]);
export const paymentStatusSchema = z.enum(["authorized", "failed", "voided"]);
export const orderHistoryEntrySchema = z.object({
  at: z.string().datetime(),
  status: z.string().min(1),
  message: z.string().min(1)
});

export const orderSchema = z.object({
  id: z.string().uuid(),
  shopperId: z.string().min(1),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  shippingAddress: indianAddressSchema,
  deliverySpeed: deliverySpeedSchema,
  items: z.array(checkoutQuoteLineSchema).min(1),
  totals: cartTotalsSchema,
  createdAt: z.string().datetime(),
  history: z.array(orderHistoryEntrySchema).min(1),
  auditEvents: z.array(orderHistoryEntrySchema).min(1),
  outboxEventIds: z.array(z.string().uuid())
});

export const checkoutQuoteResponseSchema = apiSuccessSchema(checkoutQuoteSchema);
export const orderResponseSchema = apiSuccessSchema(orderSchema);
export const orderListResponseSchema = apiSuccessSchema(paginatedSchema(orderSchema));
export const editOrderDeliveryCommandSchema = z.object({
  shippingAddress: indianAddressSchema,
  deliverySpeed: deliverySpeedSchema
});

export type CheckoutQuoteCommand = z.infer<typeof checkoutQuoteCommandSchema>;
export type CheckoutConfirmCommand = z.infer<typeof checkoutConfirmCommandSchema>;
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;
export type CheckoutQuoteLine = z.infer<typeof checkoutQuoteLineSchema>;
export type Order = z.infer<typeof orderSchema>;
export type EditOrderDeliveryCommand = z.infer<typeof editOrderDeliveryCommandSchema>;
export type MockPaymentMethod = z.infer<typeof mockPaymentMethodSchema>;
