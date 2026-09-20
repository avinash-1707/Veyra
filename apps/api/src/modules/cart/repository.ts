import { getSqlClient } from "../../platform/database.js";

const sql = getSqlClient();

export type StoredCartLine = {
  offerId: string;
  variantId: string;
  quantity: number;
  location: "cart" | "saved_for_later";
};

export type StoredCart = { id: string; lines: StoredCartLine[] };

export function hasCartPersistence(): boolean {
  return sql !== undefined;
}

export async function resetPersistentCart(cartId: string): Promise<void> {
  if (sql === undefined) return;
  await sql`DELETE FROM idempotency_records WHERE actor_id = ${cartId} AND scope LIKE 'cart:%'`;
  await sql`DELETE FROM cart_items WHERE cart_id = ${cartId}`;
}

export async function readPersistentCart(cartId: string): Promise<StoredCart> {
  if (sql === undefined) return { id: cartId, lines: [] };
  await sql`INSERT INTO carts (id) VALUES (${cartId}) ON CONFLICT (id) DO NOTHING`;
  const rows =
    await sql`SELECT offer_id, variant_id, quantity, location FROM cart_items WHERE cart_id = ${cartId} ORDER BY created_at`;
  return { id: cartId, lines: rows.map(toStoredCartLine).filter((line): line is StoredCartLine => line !== undefined) };
}

export async function addPersistentCartItem(cartId: string, line: StoredCartLine): Promise<void> {
  if (sql === undefined) return;
  await sql`INSERT INTO carts (id) VALUES (${cartId}) ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO cart_items (cart_id, offer_id, variant_id, quantity, location)
    VALUES (${cartId}, ${line.offerId}, ${line.variantId}, ${line.quantity}, 'cart')
    ON CONFLICT (cart_id, offer_id, variant_id, location)
    DO UPDATE SET quantity = LEAST(10, cart_items.quantity + EXCLUDED.quantity), updated_at = now()`;
}

export async function updatePersistentCartItemQuantity(
  cartId: string,
  offerId: string,
  variantId: string,
  quantity: number
): Promise<boolean> {
  if (sql === undefined) return false;
  const updated =
    await sql`UPDATE cart_items SET quantity = ${quantity}, updated_at = now() WHERE cart_id = ${cartId} AND offer_id = ${offerId} AND variant_id = ${variantId} RETURNING id`;
  return updated.length > 0;
}

export async function updatePersistentCartItemLocation(
  cartId: string,
  offerId: string,
  variantId: string,
  location: StoredCartLine["location"]
): Promise<boolean> {
  if (sql === undefined) return false;
  const updated =
    await sql`UPDATE cart_items SET location = ${location}, updated_at = now() WHERE cart_id = ${cartId} AND offer_id = ${offerId} AND variant_id = ${variantId} RETURNING id`;
  return updated.length > 0;
}

export async function removePersistentCartItem(cartId: string, offerId: string, variantId: string): Promise<boolean> {
  if (sql === undefined) return false;
  const deleted =
    await sql`DELETE FROM cart_items WHERE cart_id = ${cartId} AND offer_id = ${offerId} AND variant_id = ${variantId} RETURNING id`;
  return deleted.length > 0;
}

export async function readPersistentIdempotencyRecord(
  scope: string,
  actorId: string,
  idempotencyKey: string
): Promise<{ fingerprint: string; response: unknown } | undefined> {
  if (sql === undefined) return undefined;
  const rows =
    await sql`SELECT request_fingerprint, response FROM idempotency_records WHERE scope = ${scope} AND actor_id = ${actorId} AND idempotency_key = ${idempotencyKey}`;
  const row = rows[0];
  if (!isRecordObject(row) || typeof row.request_fingerprint !== "string") return undefined;
  return { fingerprint: row.request_fingerprint, response: row.response };
}

export async function savePersistentIdempotencyRecord(
  scope: string,
  actorId: string,
  idempotencyKey: string,
  fingerprint: string,
  status: string,
  response: unknown
): Promise<void> {
  if (sql === undefined) return;
  await sql`INSERT INTO idempotency_records (scope, actor_id, idempotency_key, request_fingerprint, status, response) VALUES (${scope}, ${actorId}, ${idempotencyKey}, ${fingerprint}, ${status}, ${JSON.stringify(response)}::jsonb)`;
}

function toStoredCartLine(row: unknown): StoredCartLine | undefined {
  if (
    !isRecordObject(row) ||
    typeof row.offer_id !== "string" ||
    typeof row.variant_id !== "string" ||
    typeof row.location !== "string"
  )
    return undefined;
  const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
  if (!Number.isInteger(quantity) || (row.location !== "cart" && row.location !== "saved_for_later")) return undefined;
  return { offerId: row.offer_id, variantId: row.variant_id, quantity, location: row.location };
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
