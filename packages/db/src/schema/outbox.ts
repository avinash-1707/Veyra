import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    correlationId: text("correlation_id").notNull(),
    payload: jsonb("payload").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    state: text("state").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true })
  },
  (table) => [
    check(
      "outbox_events_type_known",
      sql`${table.type} IN ('catalog.product_published', 'offer.changed', 'order.confirmed', 'shipment.status_changed', 'order.delivered', 'return.requested', 'return.refunded', 'review.published')`
    ),
    check("outbox_events_aggregate_type_nonblank", sql`btrim(${table.aggregateType}) <> ''`),
    check("outbox_events_aggregate_id_nonblank", sql`btrim(${table.aggregateId}) <> ''`),
    check("outbox_events_schema_version_positive", sql`${table.schemaVersion} > 0`),
    check("outbox_events_correlation_id_nonblank", sql`btrim(${table.correlationId}) <> ''`),
    check("outbox_events_attempt_count_nonnegative", sql`${table.attemptCount} >= 0`),
    check("outbox_events_state_known", sql`${table.state} IN ('pending', 'processing', 'processed', 'dead_letter')`),
    index("outbox_events_state_created_at_idx").on(table.state, table.createdAt)
  ]
);
