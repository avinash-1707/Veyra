import type { CheckoutConfirmCommand, CheckoutQuote, CheckoutQuoteCommand, EditOrderDeliveryCommand, Order } from "@veyra/contracts";

import { getSqlClient } from "../../platform/database.js";
import { InMemoryOutbox } from "../../platform/outbox.js";
import { readCart } from "../cart/cart.js";

const quoteTtlMs = 15 * 60 * 1_000;
const initialOfferStock = new Map<string, number>([
  ["018f3f7d-486c-7d73-9e13-83d8d0c75614", 1],
  ["018f3f7d-486c-7d73-9e13-83d8d0c75615", 5],
  ["018f3f7d-5b68-7aef-9e10-2d890fc8a614", 5]
]);

export type CommandResult<T> =
  | { status: "ok"; data: T }
  | { status: "conflict"; message: string }
  | { status: "not_found"; message: string }
  | { status: "policy_conflict"; message: string }
  | { status: "validation"; message: string };

type IdempotencyRecord = { fingerprint: string; result: CommandResult<Order> };
type HistoryEntry = Order["history"][number];

const quotes = new Map<string, CheckoutQuote>();
const orders = new Map<string, Order>();
const orderIdsByQuote = new Map<string, string>();
const idempotencyRecords = new Map<string, IdempotencyRecord>();
const stockByOffer = new Map(initialOfferStock);
const outbox = new InMemoryOutbox();

export function resetOrdersForTests(): void {
  quotes.clear();
  orders.clear();
  orderIdsByQuote.clear();
  idempotencyRecords.clear();
  stockByOffer.clear();
  for (const [offerId, quantity] of initialOfferStock) stockByOffer.set(offerId, quantity);
}

export async function expireQuoteForTests(quoteId: string): Promise<void> {
  const sql = getSqlClient();
  if (sql !== undefined) await sql`UPDATE checkout_quotes SET expires_at = now() - interval '1 second' WHERE id = ${quoteId}`;
  const quote = quotes.get(quoteId);
  if (quote !== undefined) quotes.set(quoteId, { ...quote, expiresAt: new Date(Date.now() - 1_000).toISOString() });
}

export async function expireDeliveredOrderForTests(orderId: string): Promise<void> {
  const expiredAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1_000).toISOString();
  const sql = getSqlClient();
  if (sql !== undefined) await sql`UPDATE order_history SET created_at = ${expiredAt} WHERE order_id = ${orderId} AND status = 'delivered'`;
  const order = orders.get(orderId);
  if (order !== undefined) orders.set(orderId, { ...order, history: order.history.map((entry) => entry.status === "delivered" ? { ...entry, at: expiredAt } : entry) });
}

export async function createCheckoutQuote(shopperId: string, command: CheckoutQuoteCommand): Promise<CommandResult<CheckoutQuote>> {
  const cartId = command.cartId ?? "local-guest-cart";
  const cart = await readCart(cartId);
  const cartItems = cart.items.filter((item) => item.availabilityStatus === "ok");
  if (cartItems.length === 0) return { status: "validation", message: "Add an available item before checkout." };

  const quote: CheckoutQuote = {
    id: crypto.randomUUID(),
    shopperId,
    cartId,
    expiresAt: new Date(Date.now() + quoteTtlMs).toISOString(),
    shippingAddress: command.shippingAddress,
    deliverySpeed: command.deliverySpeed,
    mockPaymentMethod: command.mockPaymentMethod,
    lines: cartItems.map((item) => ({
      cartLineId: item.id,
      productId: item.product.id,
      productSlug: item.product.slug,
      productTitle: item.product.title,
      variantId: item.product.selectedVariant.id,
      variantName: item.product.selectedVariant.name,
      offerId: item.product.selectedOffer.id,
      sellerName: item.product.selectedOffer.sellerName,
      unitPrice: item.product.selectedOffer.price,
      quantity: item.quantity,
      lineSubtotal: item.lineSubtotal,
      lineDiscount: item.lineDiscount
    })),
    totals: cart.totals
  };

  const sql = getSqlClient();
  if (sql !== undefined) {
    await sql`INSERT INTO checkout_quotes (id, shopper_id, cart_id, expires_at, shipping_address, delivery_speed, mock_payment_method, lines, totals)
      VALUES (${quote.id}, ${shopperId}, ${cartId}, ${quote.expiresAt}, ${JSON.stringify(quote.shippingAddress)}::jsonb, ${quote.deliverySpeed}, ${quote.mockPaymentMethod}, ${JSON.stringify(quote.lines)}::jsonb, ${JSON.stringify(quote.totals)}::jsonb)`;
  }
  quotes.set(quote.id, quote);
  return { status: "ok", data: quote };
}

export async function confirmCheckout(shopperId: string, command: CheckoutConfirmCommand, idempotencyKey?: string, correlationId = "local-checkout"): Promise<CommandResult<Order>> {
  const sql = getSqlClient();
  if (sql !== undefined) return runPersistentIdempotent(shopperId, command, idempotencyKey, () => confirmCheckoutPersistent(shopperId, command, correlationId));
  return runIdempotent(shopperId, command, idempotencyKey, () => confirmCheckoutMemory(shopperId, command, correlationId));
}

async function confirmCheckoutPersistent(shopperId: string, command: CheckoutConfirmCommand, correlationId: string): Promise<CommandResult<Order>> {
  const sql = getSqlClient();
  if (sql === undefined) return { status: "validation", message: "Database is not configured." };
  const quoteRows = await sql`SELECT * FROM checkout_quotes WHERE id = ${command.quoteId} AND shopper_id = ${shopperId}`;
  const quote = quoteFromRow(quoteRows[0]);
  if (quote === undefined) return { status: "not_found", message: "Checkout quote was not found." };
  const existing = await getOrderByQuoteId(quote.id);
  if (existing !== undefined) return { status: "ok", data: existing };
  if (Date.parse(quote.expiresAt) <= Date.now()) return { status: "policy_conflict", message: "Checkout quote expired. Refresh the quote and confirm again." };
  if (command.mockPaymentMethod === "mock_failure" || quote.mockPaymentMethod === "mock_failure") return { status: "policy_conflict", message: "Mock payment failed. No real card was charged." };

  for (const line of quote.lines) {
    const reserved = await sql`UPDATE inventory_stock SET reserved_quantity = reserved_quantity + ${line.quantity}, version = version + 1, updated_at = now() WHERE offer_id = ${line.offerId} AND available_quantity - reserved_quantity >= ${line.quantity} RETURNING offer_id`;
    if (reserved.length === 0) return { status: "policy_conflict", message: `${line.productTitle} no longer has enough simulated stock.` };
  }

  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();
  const outboxEventId = crypto.randomUUID();
  const order: Order = {
    id: orderId,
    shopperId,
    status: "preparing",
    paymentStatus: "authorized",
    shippingAddress: quote.shippingAddress,
    deliverySpeed: quote.deliverySpeed,
    items: quote.lines,
    totals: quote.totals,
    createdAt: now,
    history: [{ at: now, status: "confirmed", message: "Order confirmed with simulated payment authorization." }, { at: now, status: "preparing", message: "Fulfillment simulation is preparing the shipment." }],
    auditEvents: [{ at: now, status: "order.confirmed", message: "Checkout confirmed idempotently with inventory reserved and outbox recorded." }],
    outboxEventIds: [outboxEventId]
  };
  await sql`INSERT INTO orders (id, shopper_id, quote_id, status, payment_status, shipping_address, delivery_speed, items, totals, created_at)
    VALUES (${order.id}, ${shopperId}, ${quote.id}, ${order.status}, ${order.paymentStatus}, ${JSON.stringify(order.shippingAddress)}::jsonb, ${order.deliverySpeed}, ${JSON.stringify(order.items)}::jsonb, ${JSON.stringify(order.totals)}::jsonb, ${now})`;
  for (const item of order.items) await sql`INSERT INTO order_items (order_id, cart_line_id, product_id, variant_id, offer_id, item_snapshot, quantity) VALUES (${order.id}, ${item.cartLineId}, ${item.productId}, ${item.variantId}, ${item.offerId}, ${JSON.stringify(item)}::jsonb, ${item.quantity})`;
  await sql`INSERT INTO payment_attempts (order_id, mock_payment_method, status) VALUES (${order.id}, ${command.mockPaymentMethod}, 'authorized')`;
  await insertOrderEvents(order, "order.confirmed", order.auditEvents[0]?.message ?? "Order confirmed.");
  await sql`INSERT INTO shipments (order_id, status, delivery_speed) VALUES (${order.id}, 'preparing', ${order.deliverySpeed})`;
  for (const item of order.items) await sql`INSERT INTO stock_reservations (order_id, offer_id, quantity, state, expires_at) VALUES (${order.id}, ${item.offerId}, ${item.quantity}, 'reserved', ${quote.expiresAt})`;
  await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${outboxEventId}, 'order.confirmed', 'order', ${order.id}, ${correlationId}, ${JSON.stringify({ orderId: order.id, shopperId, lineCount: quote.lines.length })}::jsonb)`;
  return { status: "ok", data: order };
}

function confirmCheckoutMemory(shopperId: string, command: CheckoutConfirmCommand, correlationId: string): CommandResult<Order> {
  const quote = quotes.get(command.quoteId);
  if (quote === undefined || quote.shopperId !== shopperId) return { status: "not_found", message: "Checkout quote was not found." };
  const existingOrderId = orderIdsByQuote.get(quote.id);
  if (existingOrderId !== undefined) {
    const existingOrder = orders.get(existingOrderId);
    if (existingOrder !== undefined) return { status: "ok", data: existingOrder };
  }
  if (Date.parse(quote.expiresAt) <= Date.now()) return { status: "policy_conflict", message: "Checkout quote expired. Refresh the quote and confirm again." };
  if (command.mockPaymentMethod === "mock_failure" || quote.mockPaymentMethod === "mock_failure") return { status: "policy_conflict", message: "Mock payment failed. No real card was charged." };
  const stockProblem = quote.lines.find((line) => (stockByOffer.get(line.offerId) ?? 0) < line.quantity);
  if (stockProblem !== undefined) return { status: "policy_conflict", message: `${stockProblem.productTitle} no longer has enough simulated stock.` };
  for (const line of quote.lines) stockByOffer.set(line.offerId, (stockByOffer.get(line.offerId) ?? 0) - line.quantity);
  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();
  const outboxEvent = outbox.publish({ id: crypto.randomUUID(), type: "order.confirmed", aggregateType: "order", aggregateId: orderId, correlationId, payload: { orderId, shopperId, lineCount: quote.lines.length } });
  const order: Order = { id: orderId, shopperId, status: "preparing", paymentStatus: "authorized", shippingAddress: quote.shippingAddress, deliverySpeed: quote.deliverySpeed, items: quote.lines, totals: quote.totals, createdAt: now, history: [{ at: now, status: "confirmed", message: "Order confirmed with simulated payment authorization." }, { at: now, status: "preparing", message: "Fulfillment simulation is preparing the shipment." }], auditEvents: [{ at: now, status: "order.confirmed", message: "Checkout confirmed idempotently with inventory reserved and outbox recorded." }], outboxEventIds: [outboxEvent.id] };
  orders.set(order.id, order);
  orderIdsByQuote.set(quote.id, order.id);
  return { status: "ok", data: order };
}

export async function listOrders(shopperId: string): Promise<Order[]> {
  const sql = getSqlClient();
  if (sql === undefined) return [...orders.values()].filter((order) => order.shopperId === shopperId).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const rows = await sql`SELECT * FROM orders WHERE shopper_id = ${shopperId} ORDER BY created_at DESC`;
  const parsed = await Promise.all(rows.map(orderFromRow));
  return parsed.filter((order): order is Order => order !== undefined);
}

export async function getOrder(shopperId: string, orderId: string): Promise<CommandResult<Order>> {
  const sql = getSqlClient();
  if (sql === undefined) {
    const order = orders.get(orderId);
    if (order === undefined || order.shopperId !== shopperId) return { status: "not_found", message: "Order was not found." };
    return { status: "ok", data: order };
  }
  const rows = await sql`SELECT * FROM orders WHERE id = ${orderId} AND shopper_id = ${shopperId}`;
  const order = await orderFromRow(rows[0]);
  if (order === undefined) return { status: "not_found", message: "Order was not found." };
  return { status: "ok", data: order };
}

export async function cancelOrder(shopperId: string, orderId: string, correlationId = "local-cancel"): Promise<CommandResult<Order>> {
  const found = await getMutableOwnedOrder(shopperId, orderId);
  if (found.status !== "ok") return found;
  const order = found.data;
  if (order.status === "shipped" || order.status === "delivered" || order.status === "cancelled") return { status: "policy_conflict", message: "This order can no longer be cancelled under the simulated policy." };
  const now = new Date().toISOString();
  const updated = appendOrderEvent({ ...order, status: "cancelled", paymentStatus: "voided", outboxEventIds: [...order.outboxEventIds, crypto.randomUUID()] }, now, "cancelled", "Order cancelled before shipment; simulated authorization voided.");
  const sql = getSqlClient();
  if (sql !== undefined) {
    await sql`UPDATE orders SET status = 'cancelled', payment_status = 'voided' WHERE id = ${order.id}`;
    await insertOrderEvents(updated, "cancelled", "Order cancelled before shipment; simulated authorization voided.");
    await sql`UPDATE shipments SET status = 'cancelled' WHERE order_id = ${order.id}`;
    await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${updated.outboxEventIds.at(-1)}, 'shipment.status_changed', 'order', ${order.id}, ${correlationId}, ${JSON.stringify({ orderId: order.id, status: "cancelled" })}::jsonb)`;
  } else {
    for (const item of order.items) stockByOffer.set(item.offerId, (stockByOffer.get(item.offerId) ?? 0) + item.quantity);
    orders.set(order.id, updated);
  }
  return { status: "ok", data: updated };
}

export async function editOrderDelivery(shopperId: string, orderId: string, command: EditOrderDeliveryCommand): Promise<CommandResult<Order>> {
  const found = await getMutableOwnedOrder(shopperId, orderId);
  if (found.status !== "ok") return found;
  const order = found.data;
  if (order.status !== "preparing") return { status: "policy_conflict", message: "Delivery details can only be edited before shipment." };
  const now = new Date().toISOString();
  const updated = appendOrderEvent({ ...order, shippingAddress: command.shippingAddress, deliverySpeed: command.deliverySpeed, outboxEventIds: [...order.outboxEventIds, crypto.randomUUID()] }, now, "delivery_updated", "Delivery address and speed updated before shipment.");
  const sql = getSqlClient();
  if (sql !== undefined) {
    await sql`UPDATE orders SET shipping_address = ${JSON.stringify(command.shippingAddress)}::jsonb, delivery_speed = ${command.deliverySpeed} WHERE id = ${order.id}`;
    await insertOrderEvents(updated, "delivery_updated", "Delivery address and speed updated before shipment.");
  } else orders.set(order.id, updated);
  return { status: "ok", data: updated };
}

export async function advanceFulfillment(shopperId: string, orderId: string, correlationId = "local-fulfillment"): Promise<CommandResult<Order>> {
  const found = await getMutableOwnedOrder(shopperId, orderId);
  if (found.status !== "ok") return found;
  const order = found.data;
  if (order.status === "cancelled" || order.status === "delivered") return { status: "policy_conflict", message: "Order has no further fulfillment transitions." };
  const nextStatus = order.status === "preparing" ? "shipped" : "delivered";
  const now = new Date().toISOString();
  const eventType = nextStatus === "delivered" ? "order.delivered" : "shipment.status_changed";
  const updated = appendOrderEvent({ ...order, status: nextStatus, outboxEventIds: [...order.outboxEventIds, crypto.randomUUID()] }, now, nextStatus, nextStatus === "shipped" ? "Shipment is in transit in the local simulation." : "Order delivered in the local simulation.");
  const sql = getSqlClient();
  if (sql !== undefined) {
    await sql`UPDATE orders SET status = ${nextStatus} WHERE id = ${order.id}`;
    await insertOrderEvents(updated, nextStatus, nextStatus === "shipped" ? "Shipment is in transit in the local simulation." : "Order delivered in the local simulation.");
    await sql`UPDATE shipments SET status = ${nextStatus} WHERE order_id = ${order.id}`;
    await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${updated.outboxEventIds.at(-1)}, ${eventType}, 'order', ${order.id}, ${correlationId}, ${JSON.stringify({ orderId: order.id, status: nextStatus })}::jsonb)`;
  } else orders.set(order.id, updated);
  return { status: "ok", data: updated };
}

async function runPersistentIdempotent(shopperId: string, command: CheckoutConfirmCommand, idempotencyKey: string | undefined, execute: () => Promise<CommandResult<Order>>): Promise<CommandResult<Order>> {
  const sql = getSqlClient();
  if (sql === undefined || idempotencyKey === undefined || idempotencyKey.trim().length === 0) return execute();
  const scope = "checkout:confirm";
  const fingerprint = stableFingerprint(command);
  const existing = await sql`SELECT request_fingerprint, response FROM idempotency_records WHERE scope = ${scope} AND actor_id = ${shopperId} AND idempotency_key = ${idempotencyKey}`;
  const record = existing[0];
  if (isRecordObject(record)) {
    if (record.request_fingerprint !== fingerprint) return { status: "conflict", message: "Idempotency key was reused with a different checkout command." };
    return commandResultFromUnknown(record.response);
  }
  const result = await execute();
  await sql`INSERT INTO idempotency_records (scope, actor_id, idempotency_key, request_fingerprint, status, response) VALUES (${scope}, ${shopperId}, ${idempotencyKey}, ${fingerprint}, ${result.status}, ${JSON.stringify(result)}::jsonb)`;
  return result;
}

function runIdempotent(shopperId: string, command: CheckoutConfirmCommand, idempotencyKey: string | undefined, execute: () => CommandResult<Order>): CommandResult<Order> {
  if (idempotencyKey === undefined || idempotencyKey.trim().length === 0) return execute();
  const recordKey = `${shopperId}:confirm:${idempotencyKey}`;
  const fingerprint = stableFingerprint(command);
  const existing = idempotencyRecords.get(recordKey);
  if (existing !== undefined) return existing.fingerprint === fingerprint ? existing.result : { status: "conflict", message: "Idempotency key was reused with a different checkout command." };
  const result = execute();
  idempotencyRecords.set(recordKey, { fingerprint, result });
  return result;
}

async function getMutableOwnedOrder(shopperId: string, orderId: string): Promise<CommandResult<Order>> {
  return getOrder(shopperId, orderId);
}

async function getOrderByQuoteId(quoteId: string): Promise<Order | undefined> {
  const sql = getSqlClient();
  if (sql === undefined) return undefined;
  const rows = await sql`SELECT * FROM orders WHERE quote_id = ${quoteId}`;
  return orderFromRow(rows[0]);
}

async function insertOrderEvents(order: Order, status: string, message: string): Promise<void> {
  const sql = getSqlClient();
  if (sql === undefined) return;
  await sql`INSERT INTO order_history (order_id, status, message) VALUES (${order.id}, ${status}, ${message})`;
  await sql`INSERT INTO audit_events (actor_id, aggregate_type, aggregate_id, status, message) VALUES (${order.shopperId}, 'order', ${order.id}, ${status}, ${message})`;
}

async function orderFromRow(row: unknown): Promise<Order | undefined> {
  if (!isRecordObject(row) || typeof row.id !== "string" || typeof row.shopper_id !== "string" || typeof row.status !== "string" || typeof row.payment_status !== "string" || typeof row.delivery_speed !== "string") return undefined;
  const sql = getSqlClient();
  const historyRows = sql === undefined ? [] : await sql`SELECT status, message, created_at FROM order_history WHERE order_id = ${row.id} ORDER BY created_at`;
  const outboxRows = sql === undefined ? [] : await sql`SELECT id FROM outbox_events WHERE aggregate_type = 'order' AND aggregate_id = ${row.id} ORDER BY created_at`;
  const history = historyRows.map(historyFromRow).filter((entry): entry is HistoryEntry => entry !== undefined);
  return {
    id: row.id,
    shopperId: row.shopper_id,
    status: row.status as Order["status"],
    paymentStatus: row.payment_status as Order["paymentStatus"],
    shippingAddress: row.shipping_address as Order["shippingAddress"],
    deliverySpeed: row.delivery_speed as Order["deliverySpeed"],
    items: row.items as Order["items"],
    totals: row.totals as Order["totals"],
    createdAt: dateString(row.created_at),
    history: history.length === 0 ? [{ at: dateString(row.created_at), status: row.status, message: "Order state loaded from PostgreSQL." }] : history,
    auditEvents: history.length === 0 ? [{ at: dateString(row.created_at), status: row.status, message: "Order state loaded from PostgreSQL." }] : history,
    outboxEventIds: outboxRows.map((event) => isRecordObject(event) && typeof event.id === "string" ? event.id : undefined).filter((id): id is string => id !== undefined)
  };
}

function quoteFromRow(row: unknown): CheckoutQuote | undefined {
  if (!isRecordObject(row) || typeof row.id !== "string" || typeof row.shopper_id !== "string" || typeof row.cart_id !== "string" || typeof row.delivery_speed !== "string" || typeof row.mock_payment_method !== "string") return undefined;
  return { id: row.id, shopperId: row.shopper_id, cartId: row.cart_id, expiresAt: dateString(row.expires_at), shippingAddress: row.shipping_address as CheckoutQuote["shippingAddress"], deliverySpeed: row.delivery_speed as CheckoutQuote["deliverySpeed"], mockPaymentMethod: row.mock_payment_method as CheckoutQuote["mockPaymentMethod"], lines: row.lines as CheckoutQuote["lines"], totals: row.totals as CheckoutQuote["totals"] };
}

function historyFromRow(row: unknown): HistoryEntry | undefined {
  if (!isRecordObject(row) || typeof row.status !== "string" || typeof row.message !== "string") return undefined;
  return { at: dateString(row.created_at), status: row.status, message: row.message };
}

function commandResultFromUnknown(value: unknown): CommandResult<Order> {
  if (!isRecordObject(value) || typeof value.status !== "string") return { status: "conflict", message: "Stored idempotency result was invalid." };
  if (value.status === "ok" && isRecordObject(value.data)) return { status: "ok", data: value.data as Order };
  if ((value.status === "conflict" || value.status === "not_found" || value.status === "policy_conflict" || value.status === "validation") && typeof value.message === "string") return { status: value.status, message: value.message };
  return { status: "conflict", message: "Stored idempotency result was invalid." };
}

function appendOrderEvent(order: Order, at: string, status: string, message: string): Order {
  const entry = { at, status, message };
  return { ...order, history: [...order.history, entry], auditEvents: [...order.auditEvents, entry] };
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function dateString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? new Date(value).toISOString() : new Date().toISOString();
}

function stableFingerprint(value: unknown): string {
  return JSON.stringify(sortForFingerprint(value));
}

function sortForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForFingerprint);
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, sortForFingerprint(entry)]));
  return value;
}
