import {
  deliverySimulationDisclosure,
  type AddCartItemCommand,
  type Cart,
  type CartLine,
  type ProductFactsheet,
  type UpdateCartItemCommand
} from "@veyra/contracts";

import {
  addPersistentCartItem,
  hasCartPersistence,
  readPersistentCart,
  readPersistentIdempotencyRecord,
  removePersistentCartItem,
  resetPersistentCart,
  savePersistentIdempotencyRecord,
  type StoredCart,
  type StoredCartLine,
  updatePersistentCartItemLocation,
  updatePersistentCartItemQuantity
} from "./repository.js";
import { getFactsheetByOffer } from "../discovery/service.js";

const gstRatePercent = 18;
const freeStandardShippingThresholdMinor = 49_900;
const standardShippingMinor = 4_900;
const quantityDiscountPercent = 5;

type MutationResult =
  | { status: "ok"; cart: Cart }
  | { status: "conflict"; message: string }
  | { status: "not_found"; message: string }
  | { status: "policy_conflict"; message: string };
type IdempotencyRecord = { fingerprint: string; result: MutationResult };

const carts = new Map<string, StoredCart>();
const idempotencyRecords = new Map<string, IdempotencyRecord>();

export function resetCartsForTests(): void {
  carts.clear();
  idempotencyRecords.clear();
}

export async function resetPersistentCartsForTests(cartId: string): Promise<void> {
  await resetPersistentCart(cartId);
}

export async function readCart(cartId: string): Promise<Cart> {
  if (!hasCartPersistence()) return toCart(getOrCreateCart(cartId));
  return toCart(await readPersistentCart(cartId));
}

export async function addCartItem(
  cartId: string,
  command: AddCartItemCommand,
  idempotencyKey?: string
): Promise<MutationResult> {
  if (hasCartPersistence()) {
    return runPersistentIdempotent(cartId, "cart:add", command, idempotencyKey, async () => {
      const factsheet = await getFactsheetByOffer(command.offerId, command.variantId);
      if (factsheet === undefined) return { status: "not_found", message: "Offer and variant were not found." };
      if (factsheet.selectedOffer.availability !== "available")
        return { status: "policy_conflict", message: "Choose an available offer before adding it to cart." };
      await addPersistentCartItem(cartId, {
        offerId: command.offerId,
        variantId: command.variantId,
        quantity: command.quantity,
        location: "cart"
      });
      return { status: "ok", cart: await readCart(cartId) };
    });
  }

  return runIdempotent(cartId, "add", command, idempotencyKey, async () => {
    const factsheet = await getFactsheetByOffer(command.offerId, command.variantId);
    if (factsheet === undefined) return { status: "not_found", message: "Offer and variant were not found." };
    if (factsheet.selectedOffer.availability !== "available")
      return { status: "policy_conflict", message: "Choose an available offer before adding it to cart." };

    const cart = getOrCreateCart(cartId);
    const existing = cart.lines.find(
      (line) => line.offerId === command.offerId && line.variantId === command.variantId && line.location === "cart"
    );
    if (existing === undefined) {
      cart.lines.push({
        offerId: command.offerId,
        variantId: command.variantId,
        quantity: command.quantity,
        location: "cart"
      });
    } else {
      existing.quantity = Math.min(10, existing.quantity + command.quantity);
    }
    return { status: "ok", cart: await toCart(cart) };
  });
}

export async function updateCartItem(
  cartId: string,
  lineId: string,
  command: UpdateCartItemCommand,
  idempotencyKey?: string
): Promise<MutationResult> {
  if (hasCartPersistence()) {
    return runPersistentIdempotent(cartId, `cart:update:${lineId}`, command, idempotencyKey, async () => {
      const parsed = parseLineId(lineId);
      if (parsed === undefined) return { status: "not_found", message: "Cart item was not found." };
      const updated = await updatePersistentCartItemQuantity(
        cartId,
        parsed.offerId,
        parsed.variantId,
        command.quantity
      );
      if (!updated) return { status: "not_found", message: "Cart item was not found." };
      return { status: "ok", cart: await readCart(cartId) };
    });
  }

  return runIdempotent(cartId, `update:${lineId}`, command, idempotencyKey, async () => {
    const cart = getOrCreateCart(cartId);
    const line = findStoredLine(cart, lineId);
    if (line === undefined) return { status: "not_found", message: "Cart item was not found." };
    line.quantity = command.quantity;
    return { status: "ok", cart: await toCart(cart) };
  });
}

export async function moveCartItem(
  cartId: string,
  lineId: string,
  location: "cart" | "saved_for_later",
  idempotencyKey?: string
): Promise<MutationResult> {
  if (hasCartPersistence()) {
    return runPersistentIdempotent(
      cartId,
      `cart:move:${lineId}:${location}`,
      { location },
      idempotencyKey,
      async () => {
        const parsed = parseLineId(lineId);
        if (parsed === undefined) return { status: "not_found", message: "Cart item was not found." };
        const updated = await updatePersistentCartItemLocation(cartId, parsed.offerId, parsed.variantId, location);
        if (!updated) return { status: "not_found", message: "Cart item was not found." };
        return { status: "ok", cart: await readCart(cartId) };
      }
    );
  }

  return runIdempotent(cartId, `move:${lineId}:${location}`, { location }, idempotencyKey, async () => {
    const cart = getOrCreateCart(cartId);
    const line = findStoredLine(cart, lineId);
    if (line === undefined) return { status: "not_found", message: "Cart item was not found." };
    line.location = location;
    return { status: "ok", cart: await toCart(cart) };
  });
}

export async function removeCartItem(cartId: string, lineId: string, idempotencyKey?: string): Promise<MutationResult> {
  if (hasCartPersistence()) {
    return runPersistentIdempotent(cartId, `cart:remove:${lineId}`, {}, idempotencyKey, async () => {
      const parsed = parseLineId(lineId);
      if (parsed === undefined) return { status: "not_found", message: "Cart item was not found." };
      const deleted = await removePersistentCartItem(cartId, parsed.offerId, parsed.variantId);
      if (!deleted) return { status: "not_found", message: "Cart item was not found." };
      return { status: "ok", cart: await readCart(cartId) };
    });
  }

  return runIdempotent(cartId, `remove:${lineId}`, {}, idempotencyKey, async () => {
    const cart = getOrCreateCart(cartId);
    const originalLength = cart.lines.length;
    cart.lines = cart.lines.filter((line) => toLineId(line) !== lineId);
    if (cart.lines.length === originalLength) return { status: "not_found", message: "Cart item was not found." };
    return { status: "ok", cart: await toCart(cart) };
  });
}

async function runPersistentIdempotent(
  cartId: string,
  scope: string,
  command: unknown,
  idempotencyKey: string | undefined,
  execute: () => Promise<MutationResult>
): Promise<MutationResult> {
  if (!hasCartPersistence() || idempotencyKey === undefined || idempotencyKey.trim().length === 0) return execute();
  const fingerprint = stableFingerprint(command);
  const existing = await readPersistentIdempotencyRecord(scope, cartId, idempotencyKey);
  if (existing !== undefined) {
    if (existing.fingerprint !== fingerprint)
      return { status: "conflict", message: "Idempotency key was reused with a different cart command." };
    return mutationResultFromUnknown(existing.response);
  }
  const result = await execute();
  await savePersistentIdempotencyRecord(scope, cartId, idempotencyKey, fingerprint, result.status, result);
  return result;
}

function runIdempotent(
  cartId: string,
  operation: string,
  command: unknown,
  idempotencyKey: string | undefined,
  execute: () => Promise<MutationResult>
): Promise<MutationResult> {
  if (idempotencyKey === undefined || idempotencyKey.trim().length === 0) return execute();

  const recordKey = `${cartId}:${operation}:${idempotencyKey}`;
  const fingerprint = stableFingerprint(command);
  const existing = idempotencyRecords.get(recordKey);
  if (existing !== undefined) {
    if (existing.fingerprint !== fingerprint)
      return Promise.resolve({
        status: "conflict",
        message: "Idempotency key was reused with a different cart command."
      });
    return Promise.resolve(existing.result);
  }

  return execute().then((result) => {
    idempotencyRecords.set(recordKey, { fingerprint, result });
    return result;
  });
}

function stableFingerprint(value: unknown): string {
  return JSON.stringify(sortForFingerprint(value));
}

function sortForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForFingerprint);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForFingerprint(entry)])
    );
  }
  return value;
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mutationResultFromUnknown(value: unknown): MutationResult {
  if (!isRecordObject(value) || typeof value.status !== "string")
    return { status: "conflict", message: "Stored idempotency result was invalid." };
  if (value.status === "ok" && isRecordObject(value.cart)) return { status: "ok", cart: value.cart as Cart };
  if (
    (value.status === "conflict" || value.status === "not_found" || value.status === "policy_conflict") &&
    typeof value.message === "string"
  )
    return { status: value.status, message: value.message };
  return { status: "conflict", message: "Stored idempotency result was invalid." };
}

function parseLineId(lineId: string): { offerId: string; variantId: string } | undefined {
  const [offerId, variantId, extra] = lineId.split(":");
  if (offerId === undefined || variantId === undefined || extra !== undefined) return undefined;
  return { offerId, variantId };
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

async function toCart(cart: StoredCart): Promise<Cart> {
  const lines = (await Promise.all(cart.lines.map(toCartLine))).filter((line): line is CartLine => line !== undefined);
  const items = lines.filter((line) => line.location === "cart");
  const savedForLater = lines.filter((line) => line.location === "saved_for_later");
  const itemSubtotalMinor = sum(items.map((line) => line.lineSubtotal.amountMinor));
  const discountTotalMinor = sum(items.map((line) => line.lineDiscount.amountMinor));
  const taxableMinor = itemSubtotalMinor - discountTotalMinor;
  const shippingMinor =
    items.length === 0 || taxableMinor >= freeStandardShippingThresholdMinor ? 0 : standardShippingMinor;
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

async function toCartLine(line: StoredCartLine): Promise<CartLine | undefined> {
  const product = await getFactsheetByOffer(line.offerId, line.variantId);
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
