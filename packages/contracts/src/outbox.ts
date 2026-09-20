import { z } from "zod";

export const outboxEventTypeSchema = z.enum([
  "catalog.product_published",
  "offer.changed",
  "order.confirmed",
  "shipment.status_changed",
  "order.delivered",
  "return.requested",
  "return.refunded",
  "review.published"
]);

export const outboxEventSchema = z.object({
  id: z.uuid(),
  type: outboxEventTypeSchema,
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  schemaVersion: z.literal(1),
  occurredAt: z.iso.datetime(),
  correlationId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  attemptCount: z.number().int().nonnegative(),
  state: z.enum(["pending", "processing", "processed", "dead_letter"])
});

export type OutboxEventType = z.infer<typeof outboxEventTypeSchema>;
export type OutboxEvent = z.infer<typeof outboxEventSchema>;
