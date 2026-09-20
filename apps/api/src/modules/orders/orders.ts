import type { CheckoutConfirmCommand, CheckoutQuote, CheckoutQuoteCommand, EditOrderDeliveryCommand, Order } from "@veyra/contracts";

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

export function expireQuoteForTests(quoteId: string): void {
  const quote = quotes.get(quoteId);
  if (quote !== undefined) quotes.set(quoteId, { ...quote, expiresAt: new Date(Date.now() - 1_000).toISOString() });
}

export function expireDeliveredOrderForTests(orderId: string): void {
  const order = orders.get(orderId);
  if (order === undefined) return;
  const expiredAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1_000).toISOString();
  orders.set(orderId, { ...order, history: order.history.map((entry) => entry.status === "delivered" ? { ...entry, at: expiredAt } : entry) });
}

export function createCheckoutQuote(shopperId: string, command: CheckoutQuoteCommand): CommandResult<CheckoutQuote> {
  const cartId = command.cartId ?? "local-guest-cart";
  const cart = readCart(cartId);
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

  quotes.set(quote.id, quote);
  return { status: "ok", data: quote };
}

export function confirmCheckout(shopperId: string, command: CheckoutConfirmCommand, idempotencyKey?: string, correlationId = "local-checkout"): CommandResult<Order> {
  return runIdempotent(shopperId, command, idempotencyKey, () => {
    const quote = quotes.get(command.quoteId);
    if (quote === undefined || quote.shopperId !== shopperId) return { status: "not_found", message: "Checkout quote was not found." };
    const existingOrderId = orderIdsByQuote.get(quote.id);
    if (existingOrderId !== undefined) {
      const existingOrder = orders.get(existingOrderId);
      if (existingOrder !== undefined) return { status: "ok", data: existingOrder };
    }
    if (Date.parse(quote.expiresAt) <= Date.now()) return { status: "policy_conflict", message: "Checkout quote expired. Refresh the quote and confirm again." };
    if (command.mockPaymentMethod === "mock_failure" || quote.mockPaymentMethod === "mock_failure") {
      return { status: "policy_conflict", message: "Mock payment failed. No real card was charged." };
    }

    const stockProblem = quote.lines.find((line) => (stockByOffer.get(line.offerId) ?? 0) < line.quantity);
    if (stockProblem !== undefined) {
      return { status: "policy_conflict", message: `${stockProblem.productTitle} no longer has enough simulated stock.` };
    }

    for (const line of quote.lines) {
      stockByOffer.set(line.offerId, (stockByOffer.get(line.offerId) ?? 0) - line.quantity);
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const outboxEvent = outbox.publish({
      id: crypto.randomUUID(),
      type: "order.confirmed",
      aggregateType: "order",
      aggregateId: orderId,
      correlationId,
      payload: { orderId, shopperId, lineCount: quote.lines.length }
    });
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
      history: [
        { at: now, status: "confirmed", message: "Order confirmed with simulated payment authorization." },
        { at: now, status: "preparing", message: "Fulfillment simulation is preparing the shipment." }
      ],
      auditEvents: [{ at: now, status: "order.confirmed", message: "Checkout confirmed idempotently with inventory reserved and outbox recorded." }],
      outboxEventIds: [outboxEvent.id]
    };
    orders.set(order.id, order);
    orderIdsByQuote.set(quote.id, order.id);
    return { status: "ok", data: order };
  });
}

export function listOrders(shopperId: string): Order[] {
  return [...orders.values()].filter((order) => order.shopperId === shopperId).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getOrder(shopperId: string, orderId: string): CommandResult<Order> {
  const order = orders.get(orderId);
  if (order === undefined || order.shopperId !== shopperId) return { status: "not_found", message: "Order was not found." };
  return { status: "ok", data: order };
}

export function cancelOrder(shopperId: string, orderId: string, correlationId = "local-cancel"): CommandResult<Order> {
  const found = getMutableOwnedOrder(shopperId, orderId);
  if (found.status !== "ok") return found;
  const order = found.data;
  if (order.status === "shipped" || order.status === "delivered" || order.status === "cancelled") {
    return { status: "policy_conflict", message: "This order can no longer be cancelled under the simulated policy." };
  }
  for (const item of order.items) stockByOffer.set(item.offerId, (stockByOffer.get(item.offerId) ?? 0) + item.quantity);
  const now = new Date().toISOString();
  const outboxEvent = outbox.publish({ id: crypto.randomUUID(), type: "shipment.status_changed", aggregateType: "order", aggregateId: order.id, correlationId, payload: { orderId: order.id, status: "cancelled" } });
  const updated = appendOrderEvent({ ...order, status: "cancelled", paymentStatus: "voided", outboxEventIds: [...order.outboxEventIds, outboxEvent.id] }, now, "cancelled", "Order cancelled before shipment; simulated authorization voided.");
  orders.set(order.id, updated);
  return { status: "ok", data: updated };
}

export function editOrderDelivery(shopperId: string, orderId: string, command: EditOrderDeliveryCommand): CommandResult<Order> {
  const found = getMutableOwnedOrder(shopperId, orderId);
  if (found.status !== "ok") return found;
  const order = found.data;
  if (order.status !== "preparing") return { status: "policy_conflict", message: "Delivery details can only be edited before shipment." };
  const now = new Date().toISOString();
  const outboxEvent = outbox.publish({ id: crypto.randomUUID(), type: "order.delivery_updated", aggregateType: "order", aggregateId: order.id, correlationId: "local-delivery-edit", payload: { orderId: order.id, deliverySpeed: command.deliverySpeed } });
  const updated = appendOrderEvent({ ...order, shippingAddress: command.shippingAddress, deliverySpeed: command.deliverySpeed, outboxEventIds: [...order.outboxEventIds, outboxEvent.id] }, now, "delivery_updated", "Delivery address and speed updated before shipment.");
  orders.set(order.id, updated);
  return { status: "ok", data: updated };
}

export function advanceFulfillment(shopperId: string, orderId: string, correlationId = "local-fulfillment"): CommandResult<Order> {
  const found = getMutableOwnedOrder(shopperId, orderId);
  if (found.status !== "ok") return found;
  const order = found.data;
  if (order.status === "cancelled" || order.status === "delivered") return { status: "policy_conflict", message: "Order has no further fulfillment transitions." };
  const nextStatus = order.status === "preparing" ? "shipped" : "delivered";
  const now = new Date().toISOString();
  const eventType = nextStatus === "delivered" ? "order.delivered" : "shipment.status_changed";
  const outboxEvent = outbox.publish({ id: crypto.randomUUID(), type: eventType, aggregateType: "order", aggregateId: order.id, correlationId, payload: { orderId: order.id, status: nextStatus } });
  const updated = appendOrderEvent({ ...order, status: nextStatus, outboxEventIds: [...order.outboxEventIds, outboxEvent.id] }, now, nextStatus, nextStatus === "shipped" ? "Shipment is in transit in the local simulation." : "Order delivered in the local simulation.");
  orders.set(order.id, updated);
  return { status: "ok", data: updated };
}

function runIdempotent(shopperId: string, command: CheckoutConfirmCommand, idempotencyKey: string | undefined, execute: () => CommandResult<Order>): CommandResult<Order> {
  if (idempotencyKey === undefined || idempotencyKey.trim().length === 0) return execute();
  const recordKey = `${shopperId}:confirm:${idempotencyKey}`;
  const fingerprint = stableFingerprint(command);
  const existing = idempotencyRecords.get(recordKey);
  if (existing !== undefined) {
    if (existing.fingerprint !== fingerprint) return { status: "conflict", message: "Idempotency key was reused with a different checkout command." };
    return existing.result;
  }
  const result = execute();
  idempotencyRecords.set(recordKey, { fingerprint, result });
  return result;
}

function getMutableOwnedOrder(shopperId: string, orderId: string): CommandResult<Order> {
  const order = orders.get(orderId);
  if (order === undefined || order.shopperId !== shopperId) return { status: "not_found", message: "Order was not found." };
  return { status: "ok", data: order };
}

function appendOrderEvent(order: Order, at: string, status: string, message: string): Order {
  const entry = { at, status, message };
  return { ...order, history: [...order.history, entry], auditEvents: [...order.auditEvents, entry] };
}

function stableFingerprint(value: unknown): string {
  return JSON.stringify(sortForFingerprint(value));
}

function sortForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForFingerprint);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, sortForFingerprint(entry)]));
  }
  return value;
}
