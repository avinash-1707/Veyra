import { deliverySimulationDisclosure, type AddCartItemCommand, type Cart, type CartLine, type ProductFactsheet, type UpdateCartItemCommand } from "@veyra/contracts";

import { getFactsheetByOffer } from "../discovery/discovery.js";

const gstRatePercent = 18;
const freeStandardShippingThresholdMinor = 49_900;
const standardShippingMinor = 4_900;
const quantityDiscountPercent = 5;

type StoredCartLine = {
  offerId: string;
  variantId: string;
  quantity: number;
  location: "cart" | "saved_for_later";
};

type StoredCart = { id: string; lines: StoredCartLine[] };

type MutationResult = { status: "ok"; cart: Cart } | { status: "conflict"; message: string } | { status: "not_found"; message: string } | { status: "policy_conflict"; message: string };
type IdempotencyRecord = { fingerprint: string; result: MutationResult };

const carts = new Map<string, StoredCart>();
const idempotencyRecords = new Map<string, IdempotencyRecord>();

export function resetCartsForTests(): void {
  carts.clear();
  idempotencyRecords.clear();
}

export function readCart(cartId: string): Cart {
  return toCart(getOrCreateCart(cartId));
}

export function addCartItem(cartId: string, command: AddCartItemCommand, idempotencyKey?: string): MutationResult {
  return runIdempotent(cartId, "add", command, idempotencyKey, () => {
    const factsheet = getFactsheetByOffer(command.offerId, command.variantId);
    if (factsheet === undefined) return { status: "not_found", message: "Offer and variant were not found." };
    if (factsheet.selectedOffer.availability !== "available") return { status: "policy_conflict", message: "Choose an available offer before adding it to cart." };

    const cart = getOrCreateCart(cartId);
    const existing = cart.lines.find((line) => line.offerId === command.offerId && line.variantId === command.variantId && line.location === "cart");
    if (existing === undefined) {
      cart.lines.push({ offerId: command.offerId, variantId: command.variantId, quantity: command.quantity, location: "cart" });
    } else {
      existing.quantity = Math.min(10, existing.quantity + command.quantity);
    }
    return { status: "ok", cart: toCart(cart) };
  });
}

export function updateCartItem(cartId: string, lineId: string, command: UpdateCartItemCommand, idempotencyKey?: string): MutationResult {
  return runIdempotent(cartId, `update:${lineId}`, command, idempotencyKey, () => {
    const cart = getOrCreateCart(cartId);
    const line = findStoredLine(cart, lineId);
    if (line === undefined) return { status: "not_found", message: "Cart item was not found." };
    line.quantity = command.quantity;
    return { status: "ok", cart: toCart(cart) };
  });
}

export function moveCartItem(cartId: string, lineId: string, location: "cart" | "saved_for_later", idempotencyKey?: string): MutationResult {
  return runIdempotent(cartId, `move:${lineId}:${location}`, { location }, idempotencyKey, () => {
    const cart = getOrCreateCart(cartId);
    const line = findStoredLine(cart, lineId);
    if (line === undefined) return { status: "not_found", message: "Cart item was not found." };
    line.location = location;
    return { status: "ok", cart: toCart(cart) };
  });
}

export function removeCartItem(cartId: string, lineId: string, idempotencyKey?: string): MutationResult {
  return runIdempotent(cartId, `remove:${lineId}`, {}, idempotencyKey, () => {
    const cart = getOrCreateCart(cartId);
    const originalLength = cart.lines.length;
    cart.lines = cart.lines.filter((line) => toLineId(line) !== lineId);
    if (cart.lines.length === originalLength) return { status: "not_found", message: "Cart item was not found." };
    return { status: "ok", cart: toCart(cart) };
  });
}

function runIdempotent(cartId: string, operation: string, command: unknown, idempotencyKey: string | undefined, execute: () => MutationResult): MutationResult {
  if (idempotencyKey === undefined || idempotencyKey.trim().length === 0) return execute();

  const recordKey = `${cartId}:${operation}:${idempotencyKey}`;
  const fingerprint = stableFingerprint(command);
  const existing = idempotencyRecords.get(recordKey);
  if (existing !== undefined) {
    if (existing.fingerprint !== fingerprint) return { status: "conflict", message: "Idempotency key was reused with a different cart command." };
    return existing.result;
  }

  const result = execute();
  idempotencyRecords.set(recordKey, { fingerprint, result });
  return result;
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

function getOrCreateCart(cartId: string): StoredCart {
  const existing = carts.get(cartId);
  if (existing !== undefined) return existing;
  const created = { id: cartId, lines: [] } satisfies StoredCart;
  carts.set(cartId, created);
  return created;
}

function findStoredLine(cart: StoredCart, lineId: string): StoredCartLine | undefined {
  return cart.lines.find((line) => toLineId(line) === lineId);
}

function toLineId(line: StoredCartLine): string {
  return `${line.offerId}:${line.variantId}`;
}

function toCart(cart: StoredCart): Cart {
  const lines = cart.lines
    .map(toCartLine)
    .filter((line): line is CartLine => line !== undefined);
  const items = lines.filter((line) => line.location === "cart");
  const savedForLater = lines.filter((line) => line.location === "saved_for_later");
  const itemSubtotalMinor = sum(items.map((line) => line.lineSubtotal.amountMinor));
  const discountTotalMinor = sum(items.map((line) => line.lineDiscount.amountMinor));
  const taxableMinor = itemSubtotalMinor - discountTotalMinor;
  const shippingMinor = items.length === 0 || taxableMinor >= freeStandardShippingThresholdMinor ? 0 : standardShippingMinor;
  const estimatedTaxMinor = Math.round((taxableMinor * gstRatePercent) / 100);
  const grandTotalMinor = taxableMinor + shippingMinor + estimatedTaxMinor;

  return {
    id: cart.id,
    items,
    savedForLater,
    itemCount: sum(items.map((line) => line.quantity)),
    totals: {
      currency: "INR",
      itemSubtotal: { currency: "INR", amountMinor: itemSubtotalMinor },
      discountTotal: { currency: "INR", amountMinor: discountTotalMinor },
      shipping: { currency: "INR", amountMinor: shippingMinor },
      estimatedTax: { currency: "INR", amountMinor: estimatedTaxMinor },
      grandTotal: { currency: "INR", amountMinor: grandTotalMinor },
      disclosure: deliverySimulationDisclosure
    }
  };
}

function toCartLine(line: StoredCartLine): CartLine | undefined {
  const product = getFactsheetByOffer(line.offerId, line.variantId);
  if (product === undefined) return undefined;
  const lineSubtotalMinor = product.selectedOffer.price.amountMinor * line.quantity;
  const lineDiscountMinor = calculateLineDiscount(product, line.quantity);
  return {
    id: toLineId(line),
    product,
    quantity: line.quantity,
    location: line.location,
    lineSubtotal: { currency: "INR", amountMinor: lineSubtotalMinor },
    lineDiscount: { currency: "INR", amountMinor: lineDiscountMinor },
    availabilityStatus: product.selectedOffer.availability === "available" ? "ok" : "offer_unavailable"
  };
}

function calculateLineDiscount(product: ProductFactsheet, quantity: number): number {
  if (quantity < 2) return 0;
  return Math.floor((product.selectedOffer.price.amountMinor * quantity * quantityDiscountPercent) / 100);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
