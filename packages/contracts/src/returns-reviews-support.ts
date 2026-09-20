import { z } from "zod";

import { apiSuccessSchema, paginatedSchema } from "./api.js";
import { checkoutQuoteLineSchema, orderHistoryEntrySchema } from "./checkout-order.js";

export const returnReasonSchema = z.enum(["damaged", "wrong_item", "not_as_described", "changed_mind"]);
export const returnStateSchema = z.enum(["requested", "received", "approved", "refunded", "rejected", "cancelled"]);
export const refundStatusSchema = z.enum(["not_started", "pending", "refunded"]);

export const returnEligibilitySchema = z.object({
  orderId: z.uuid(),
  lineId: z.string().min(1),
  eligible: z.boolean(),
  reason: z.string().min(1),
  deadline: z.iso.datetime().optional(),
  supportedOutcomes: z.array(z.literal("refund"))
});

export const createReturnCommandSchema = z.object({
  orderId: z.uuid(),
  lineId: z.string().min(1),
  reason: returnReasonSchema
});

export const returnRequestSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  shopperId: z.string().min(1),
  item: checkoutQuoteLineSchema,
  reason: returnReasonSchema,
  state: returnStateSchema,
  refundStatus: refundStatusSchema,
  createdAt: z.iso.datetime(),
  history: z.array(orderHistoryEntrySchema).min(1),
  auditEvents: z.array(orderHistoryEntrySchema).min(1),
  outboxEventIds: z.array(z.uuid())
});

export const reviewSubmissionSchema = z.object({
  orderId: z.uuid(),
  lineId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2_000)
});
export const shopperReviewSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  lineId: z.string().min(1),
  productId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1),
  body: z.string().min(1),
  verifiedPurchase: z.literal(true),
  moderationStatus: z.literal("published"),
  createdAt: z.iso.datetime()
});

export const supportActionSchema = z.enum(["track", "cancel", "return", "refund"]);
export const supportProposalCommandSchema = z.object({
  orderId: z.uuid(),
  action: supportActionSchema,
  lineId: z.string().min(1).optional(),
  reason: returnReasonSchema.optional(),
  returnId: z.uuid().optional()
});
export const supportProposalSchema = z.object({
  id: z.uuid(),
  shopperId: z.string().min(1),
  orderId: z.uuid(),
  action: supportActionSchema,
  summary: z.string().min(1),
  constraints: z.string().min(1),
  command: supportProposalCommandSchema,
  createdAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime().optional()
});
export const confirmSupportActionCommandSchema = z.object({ proposalId: z.uuid() });
export const supportConfirmationSchema = z.object({ proposal: supportProposalSchema, outcome: z.string().min(1) });

export const returnEligibilityResponseSchema = apiSuccessSchema(returnEligibilitySchema);
export const returnResponseSchema = apiSuccessSchema(returnRequestSchema);
export const returnListResponseSchema = apiSuccessSchema(paginatedSchema(returnRequestSchema));
export const reviewResponseSchema = apiSuccessSchema(shopperReviewSchema);
export const reviewListResponseSchema = apiSuccessSchema(paginatedSchema(shopperReviewSchema));
export const supportProposalResponseSchema = apiSuccessSchema(supportProposalSchema);
export const supportConfirmationResponseSchema = apiSuccessSchema(supportConfirmationSchema);

export type CreateReturnCommand = z.infer<typeof createReturnCommandSchema>;
export type ReturnEligibility = z.infer<typeof returnEligibilitySchema>;
export type ReturnRequest = z.infer<typeof returnRequestSchema>;
export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
export type ShopperReview = z.infer<typeof shopperReviewSchema>;
export type SupportProposalCommand = z.infer<typeof supportProposalCommandSchema>;
export type SupportProposal = z.infer<typeof supportProposalSchema>;
