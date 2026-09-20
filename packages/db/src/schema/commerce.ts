import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { products } from "./products.js";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  attributes: jsonb("attributes").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("product_variants_product_id_idx").on(table.productId)]);

export const sellers = pgTable("sellers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id").notNull().references(() => sellers.id),
  currency: text("currency").notNull().default("INR"),
  amountMinor: integer("amount_minor").notNull(),
  condition: text("condition").notNull(),
  availability: text("availability").notNull(),
  expeditedEligible: boolean("expedited_eligible").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("offers_product_id_idx").on(table.productId),
  index("offers_variant_id_idx").on(table.variantId),
  check("offers_currency_inr", sql`${table.currency} = 'INR'`),
  check("offers_condition_known", sql`${table.condition} IN ('new', 'open_box')`),
  check("offers_availability_known", sql`${table.availability} IN ('available', 'unavailable', 'withdrawn')`)
]);

export const inventoryStock = pgTable("inventory_stock", {
  offerId: uuid("offer_id").primaryKey().references(() => offers.id, { onDelete: "cascade" }),
  availableQuantity: integer("available_quantity").notNull(),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const carts = pgTable("carts", {
  id: text("id").primaryKey(),
  shopperId: text("shopper_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  offerId: uuid("offer_id").notNull().references(() => offers.id),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id),
  quantity: integer("quantity").notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("cart_items_cart_id_idx").on(table.cartId), unique("cart_items_unique_line").on(table.cartId, table.offerId, table.variantId, table.location)]);

export const idempotencyRecords = pgTable("idempotency_records", {
  scope: text("scope").notNull(),
  actorId: text("actor_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  status: text("status").notNull(),
  response: jsonb("response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.scope, table.actorId, table.idempotencyKey] })]);

export const checkoutQuotes = pgTable("checkout_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopperId: text("shopper_id").notNull(),
  cartId: text("cart_id").notNull().references(() => carts.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  deliverySpeed: text("delivery_speed").notNull(),
  mockPaymentMethod: text("mock_payment_method").notNull(),
  lines: jsonb("lines").notNull(),
  totals: jsonb("totals").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("checkout_quotes_shopper_id_idx").on(table.shopperId)]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopperId: text("shopper_id").notNull(),
  quoteId: uuid("quote_id").notNull().unique().references(() => checkoutQuotes.id),
  status: text("status").notNull(),
  paymentStatus: text("payment_status").notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  deliverySpeed: text("delivery_speed").notNull(),
  items: jsonb("items").notNull(),
  totals: jsonb("totals").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("orders_shopper_created_at_idx").on(table.shopperId, table.createdAt)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  cartLineId: text("cart_line_id").notNull(),
  productId: uuid("product_id").notNull().references(() => products.id),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id),
  offerId: uuid("offer_id").notNull().references(() => offers.id),
  itemSnapshot: jsonb("item_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const paymentAttempts = pgTable("payment_attempts", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), mockPaymentMethod: text("mock_payment_method").notNull(), status: text("status").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const orderHistory = pgTable("order_history", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), status: text("status").notNull(), message: text("message").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("order_history_order_id_created_at_idx").on(table.orderId, table.createdAt)]);
export const stockReservations = pgTable("stock_reservations", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), offerId: uuid("offer_id").notNull().references(() => offers.id), quantity: integer("quantity").notNull(), state: text("state").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const shipments = pgTable("shipments", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().unique().references(() => orders.id, { onDelete: "cascade" }), status: text("status").notNull(), deliverySpeed: text("delivery_speed").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() });
export const shipmentHistory = pgTable("shipment_history", { id: uuid("id").primaryKey().defaultRandom(), shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }), status: text("status").notNull(), message: text("message").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });

export const returnRequests = pgTable("return_requests", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), shopperId: text("shopper_id").notNull(), lineId: text("line_id").notNull(), itemSnapshot: jsonb("item_snapshot").notNull(), reason: text("reason").notNull(), state: text("state").notNull(), refundStatus: text("refund_status").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("return_requests_shopper_order_idx").on(table.shopperId, table.orderId), uniqueIndex("return_requests_active_line_idx").on(table.orderId, table.lineId)]);
export const returnHistory = pgTable("return_history", { id: uuid("id").primaryKey().defaultRandom(), returnId: uuid("return_id").notNull().references(() => returnRequests.id, { onDelete: "cascade" }), status: text("status").notNull(), message: text("message").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const refunds = pgTable("refunds", { id: uuid("id").primaryKey().defaultRandom(), returnId: uuid("return_id").notNull().unique().references(() => returnRequests.id, { onDelete: "cascade" }), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), status: text("status").notNull(), amount: jsonb("amount").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() });

export const reviews = pgTable("reviews", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }), lineId: text("line_id"), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), shopperId: text("shopper_id"), rating: integer("rating").notNull(), title: text("title").notNull(), body: text("body").notNull(), authorDisplayName: text("author_display_name").notNull().default("Verified shopper"), verifiedPurchase: boolean("verified_purchase").notNull().default(false), moderationStatus: text("moderation_status").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("reviews_product_created_at_idx").on(table.productId, table.createdAt)]);
export const reviewVotes = pgTable("review_votes", { id: uuid("id").primaryKey().defaultRandom(), reviewId: uuid("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }), shopperId: text("shopper_id").notNull(), vote: text("vote").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [unique("review_votes_review_shopper_unique").on(table.reviewId, table.shopperId)]);
export const questions = pgTable("questions", { id: uuid("id").primaryKey().defaultRandom(), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), shopperId: text("shopper_id"), question: text("question").notNull(), answer: text("answer"), moderationStatus: text("moderation_status").notNull().default("published"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("questions_product_created_at_idx").on(table.productId, table.createdAt)]);
export const supportProposals = pgTable("support_proposals", { id: uuid("id").primaryKey().defaultRandom(), shopperId: text("shopper_id").notNull(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), action: text("action").notNull(), summary: text("summary").notNull(), constraintsText: text("constraints_text").notNull(), command: jsonb("command").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), confirmedAt: timestamp("confirmed_at", { withTimezone: true }) });
export const auditEvents = pgTable("audit_events", { id: uuid("id").primaryKey().defaultRandom(), actorId: text("actor_id").notNull(), aggregateType: text("aggregate_type").notNull(), aggregateId: text("aggregate_id").notNull(), status: text("status").notNull(), message: text("message").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("audit_events_aggregate_idx").on(table.aggregateType, table.aggregateId, table.createdAt)]);
