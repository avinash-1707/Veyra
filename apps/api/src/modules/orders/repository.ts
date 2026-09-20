import type { CheckoutQuote, Order } from "@veyra/contracts";

import { getSqlClient } from "../../platform/database.js";

const sql = getSqlClient();
type HistoryEntry = Order["history"][number];

export function hasOrderPersistence(): boolean {
  return sql !== undefined;
}
export async function expirePersistentQuote(quoteId: string): Promise<void> {
  if (sql !== undefined)
    await sql`UPDATE checkout_quotes SET expires_at = now() - interval '1 second' WHERE id = ${quoteId}`;
}
export async function expirePersistentDeliveredOrder(orderId: string, expiredAt: string): Promise<void> {
  if (sql !== undefined)
    await sql`UPDATE order_history SET created_at = ${expiredAt} WHERE order_id = ${orderId} AND status = 'delivered'`;
}
export async function saveQuote(quote: CheckoutQuote): Promise<void> {
  if (sql !== undefined)
    await sql`INSERT INTO checkout_quotes (id, shopper_id, cart_id, expires_at, shipping_address, delivery_speed, mock_payment_method, lines, totals) VALUES (${quote.id}, ${quote.shopperId}, ${quote.cartId}, ${quote.expiresAt}, ${JSON.stringify(quote.shippingAddress)}::jsonb, ${quote.deliverySpeed}, ${quote.mockPaymentMethod}, ${JSON.stringify(quote.lines)}::jsonb, ${JSON.stringify(quote.totals)}::jsonb)`;
}
export async function getPersistentQuote(shopperId: string, quoteId: string): Promise<CheckoutQuote | undefined> {
  if (sql === undefined) return undefined;
  const rows = await sql`SELECT * FROM checkout_quotes WHERE id = ${quoteId} AND shopper_id = ${shopperId}`;
  return quoteFromRow(rows[0]);
}
export async function getPersistentOrderByQuoteId(quoteId: string): Promise<Order | undefined> {
  if (sql === undefined) return undefined;
  const rows = await sql`SELECT * FROM orders WHERE quote_id = ${quoteId}`;
  return orderFromRow(rows[0]);
}
export async function reservePersistentStock(offerId: string, quantity: number): Promise<boolean> {
  if (sql === undefined) return false;
  const rows =
    await sql`UPDATE inventory_stock SET reserved_quantity = reserved_quantity + ${quantity}, version = version + 1, updated_at = now() WHERE offer_id = ${offerId} AND available_quantity - reserved_quantity >= ${quantity} RETURNING offer_id`;
  return rows.length > 0;
}
export async function saveConfirmedOrder(
  order: Order,
  quote: CheckoutQuote,
  paymentMethod: string,
  correlationId: string
): Promise<void> {
  if (sql === undefined) return;
  await sql`INSERT INTO orders (id, shopper_id, quote_id, status, payment_status, shipping_address, delivery_speed, items, totals, created_at) VALUES (${order.id}, ${order.shopperId}, ${quote.id}, ${order.status}, ${order.paymentStatus}, ${JSON.stringify(order.shippingAddress)}::jsonb, ${order.deliverySpeed}, ${JSON.stringify(order.items)}::jsonb, ${JSON.stringify(order.totals)}::jsonb, ${order.createdAt})`;
  for (const item of order.items)
    await sql`INSERT INTO order_items (order_id, cart_line_id, product_id, variant_id, offer_id, item_snapshot, quantity) VALUES (${order.id}, ${item.cartLineId}, ${item.productId}, ${item.variantId}, ${item.offerId}, ${JSON.stringify(item)}::jsonb, ${item.quantity})`;
  await sql`INSERT INTO payment_attempts (order_id, mock_payment_method, status) VALUES (${order.id}, ${paymentMethod}, 'authorized')`;
  await saveOrderEvents(order, "order.confirmed", order.auditEvents[0]?.message ?? "Order confirmed.");
  await sql`INSERT INTO shipments (order_id, status, delivery_speed) VALUES (${order.id}, 'preparing', ${order.deliverySpeed})`;
  for (const item of order.items)
    await sql`INSERT INTO stock_reservations (order_id, offer_id, quantity, state, expires_at) VALUES (${order.id}, ${item.offerId}, ${item.quantity}, 'reserved', ${quote.expiresAt})`;
  await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${order.outboxEventIds[0]}, 'order.confirmed', 'order', ${order.id}, ${correlationId}, ${JSON.stringify({ orderId: order.id, shopperId: order.shopperId, lineCount: quote.lines.length })}::jsonb)`;
}
export async function listPersistentOrders(shopperId: string): Promise<Order[]> {
  if (sql === undefined) return [];
  const rows = await sql`SELECT * FROM orders WHERE shopper_id = ${shopperId} ORDER BY created_at DESC`;
  return (await Promise.all(rows.map(orderFromRow))).filter((order): order is Order => order !== undefined);
}
export async function getPersistentOrder(shopperId: string, orderId: string): Promise<Order | undefined> {
  if (sql === undefined) return undefined;
  const rows = await sql`SELECT * FROM orders WHERE id = ${orderId} AND shopper_id = ${shopperId}`;
  return orderFromRow(rows[0]);
}
export async function cancelPersistentOrder(order: Order, correlationId: string): Promise<void> {
  if (sql === undefined) return;
  await sql`UPDATE orders SET status = 'cancelled', payment_status = 'voided' WHERE id = ${order.id}`;
  await saveOrderEvents(order, "cancelled", "Order cancelled before shipment; simulated authorization voided.");
  await sql`UPDATE shipments SET status = 'cancelled' WHERE order_id = ${order.id}`;
  await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${order.outboxEventIds.at(-1)}, 'shipment.status_changed', 'order', ${order.id}, ${correlationId}, ${JSON.stringify({ orderId: order.id, status: "cancelled" })}::jsonb)`;
}
export async function updatePersistentOrderDelivery(order: Order): Promise<void> {
  if (sql === undefined) return;
  await sql`UPDATE orders SET shipping_address = ${JSON.stringify(order.shippingAddress)}::jsonb, delivery_speed = ${order.deliverySpeed} WHERE id = ${order.id}`;
  await saveOrderEvents(order, "delivery_updated", "Delivery address and speed updated before shipment.");
}
export async function advancePersistentOrder(order: Order, eventType: string, correlationId: string): Promise<void> {
  if (sql === undefined) return;
  await sql`UPDATE orders SET status = ${order.status} WHERE id = ${order.id}`;
  const message =
    order.status === "shipped"
      ? "Shipment is in transit in the local simulation."
      : "Order delivered in the local simulation.";
  await saveOrderEvents(order, order.status, message);
  await sql`UPDATE shipments SET status = ${order.status} WHERE order_id = ${order.id}`;
  await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${order.outboxEventIds.at(-1)}, ${eventType}, 'order', ${order.id}, ${correlationId}, ${JSON.stringify({ orderId: order.id, status: order.status })}::jsonb)`;
}
export async function readPersistentIdempotencyRecord(
  scope: string,
  actorId: string,
  key: string
): Promise<{ fingerprint: string; response: unknown } | undefined> {
  if (sql === undefined) return undefined;
  const rows =
    await sql`SELECT request_fingerprint, response FROM idempotency_records WHERE scope = ${scope} AND actor_id = ${actorId} AND idempotency_key = ${key}`;
  const row = rows[0];
  return isRecordObject(row) && typeof row.request_fingerprint === "string"
    ? { fingerprint: row.request_fingerprint, response: row.response }
    : undefined;
}
export async function savePersistentIdempotencyRecord(
  scope: string,
  actorId: string,
  key: string,
  fingerprint: string,
  status: string,
  response: unknown
): Promise<void> {
  if (sql !== undefined)
    await sql`INSERT INTO idempotency_records (scope, actor_id, idempotency_key, request_fingerprint, status, response) VALUES (${scope}, ${actorId}, ${key}, ${fingerprint}, ${status}, ${JSON.stringify(response)}::jsonb)`;
}
async function saveOrderEvents(order: Order, status: string, message: string): Promise<void> {
  if (sql === undefined) return;
  await sql`INSERT INTO order_history (order_id, status, message) VALUES (${order.id}, ${status}, ${message})`;
  await sql`INSERT INTO audit_events (actor_id, aggregate_type, aggregate_id, status, message) VALUES (${order.shopperId}, 'order', ${order.id}, ${status}, ${message})`;
}
async function orderFromRow(row: unknown): Promise<Order | undefined> {
  if (
    !isRecordObject(row) ||
    typeof row.id !== "string" ||
    typeof row.shopper_id !== "string" ||
    typeof row.status !== "string" ||
    typeof row.payment_status !== "string" ||
    typeof row.delivery_speed !== "string"
  )
    return undefined;
  const historyRows =
    sql === undefined
      ? []
      : await sql`SELECT status, message, created_at FROM order_history WHERE order_id = ${row.id} ORDER BY created_at`;
  const outboxRows =
    sql === undefined
      ? []
      : await sql`SELECT id FROM outbox_events WHERE aggregate_type = 'order' AND aggregate_id = ${row.id} ORDER BY created_at`;
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
    history:
      history.length === 0
        ? [{ at: dateString(row.created_at), status: row.status, message: "Order state loaded from PostgreSQL." }]
        : history,
    auditEvents:
      history.length === 0
        ? [{ at: dateString(row.created_at), status: row.status, message: "Order state loaded from PostgreSQL." }]
        : history,
    outboxEventIds: outboxRows
      .map((event) => (isRecordObject(event) && typeof event.id === "string" ? event.id : undefined))
      .filter((id): id is string => id !== undefined)
  };
}
function quoteFromRow(row: unknown): CheckoutQuote | undefined {
  if (
    !isRecordObject(row) ||
    typeof row.id !== "string" ||
    typeof row.shopper_id !== "string" ||
    typeof row.cart_id !== "string" ||
    typeof row.delivery_speed !== "string" ||
    typeof row.mock_payment_method !== "string"
  )
    return undefined;
  return {
    id: row.id,
    shopperId: row.shopper_id,
    cartId: row.cart_id,
    expiresAt: dateString(row.expires_at),
    shippingAddress: row.shipping_address as CheckoutQuote["shippingAddress"],
    deliverySpeed: row.delivery_speed as CheckoutQuote["deliverySpeed"],
    mockPaymentMethod: row.mock_payment_method as CheckoutQuote["mockPaymentMethod"],
    lines: row.lines as CheckoutQuote["lines"],
    totals: row.totals as CheckoutQuote["totals"]
  };
}
function historyFromRow(row: unknown): HistoryEntry | undefined {
  return isRecordObject(row) && typeof row.status === "string" && typeof row.message === "string"
    ? { at: dateString(row.created_at), status: row.status, message: row.message }
    : undefined;
}
function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function dateString(value: unknown): string {
  return value instanceof Date
    ? value.toISOString()
    : typeof value === "string"
      ? new Date(value).toISOString()
      : new Date().toISOString();
}
