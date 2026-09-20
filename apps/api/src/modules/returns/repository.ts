import type { ReturnRequest, ShopperReview, SupportProposal, SupportProposalCommand } from "@veyra/contracts";
import { getSqlClient } from "../../platform/database.js";
const sql = getSqlClient();
export function hasReturnPersistence(): boolean {
  return sql !== undefined;
}
export async function hasActivePersistentReturn(orderId: string, lineId: string): Promise<boolean> {
  if (sql === undefined) return false;
  return (
    (
      await sql`SELECT id FROM return_requests WHERE order_id = ${orderId} AND line_id = ${lineId} AND state NOT IN ('rejected', 'cancelled') LIMIT 1`
    ).length > 0
  );
}
export async function saveReturn(request: ReturnRequest, correlationId: string): Promise<void> {
  if (sql === undefined) return;
  await sql`INSERT INTO return_requests (id, order_id, shopper_id, line_id, item_snapshot, reason, state, refund_status, created_at) VALUES (${request.id}, ${request.orderId}, ${request.shopperId}, ${request.item.cartLineId}, ${JSON.stringify(request.item)}::jsonb, ${request.reason}, 'requested', 'not_started', ${request.createdAt})`;
  await sql`INSERT INTO return_history (return_id, status, message, created_at) VALUES (${request.id}, 'requested', 'Return requested for a simulated refund.', ${request.createdAt})`;
  await sql`INSERT INTO audit_events (actor_id, aggregate_type, aggregate_id, status, message, created_at) VALUES (${request.shopperId}, 'return', ${request.id}, 'return.requested', 'Shopper submitted a policy-eligible return request.', ${request.createdAt})`;
  await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${request.outboxEventIds[0]}, 'return.requested', 'return', ${request.id}, ${correlationId}, ${JSON.stringify({ orderId: request.orderId, lineId: request.item.cartLineId, reason: request.reason })}::jsonb)`;
}
export async function getPersistentReturn(shopperId: string, returnId: string): Promise<ReturnRequest | undefined> {
  if (sql === undefined) return undefined;
  return returnFromRow(
    (await sql`SELECT * FROM return_requests WHERE id = ${returnId} AND shopper_id = ${shopperId}`)[0]
  );
}
export async function listPersistentReturns(shopperId: string, orderId?: string): Promise<ReturnRequest[]> {
  if (sql === undefined) return [];
  const rows =
    orderId === undefined
      ? await sql`SELECT * FROM return_requests WHERE shopper_id = ${shopperId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM return_requests WHERE shopper_id = ${shopperId} AND order_id = ${orderId} ORDER BY created_at DESC`;
  return (await Promise.all(rows.map(returnFromRow))).filter(
    (request): request is ReturnRequest => request !== undefined
  );
}
export async function advancePersistentReturn(request: ReturnRequest, correlationId: string): Promise<void> {
  if (sql === undefined) return;
  const history = request.history.at(-1);
  await sql`UPDATE return_requests SET state = ${request.state}, refund_status = ${request.refundStatus} WHERE id = ${request.id}`;
  await sql`INSERT INTO return_history (return_id, status, message, created_at) VALUES (${request.id}, ${request.state}, ${history?.message ?? "Return advanced."}, ${history?.at ?? new Date().toISOString()})`;
  if (request.state === "refunded")
    await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${request.outboxEventIds.at(-1)}, 'return.refunded', 'return', ${request.id}, ${correlationId}, ${JSON.stringify({ returnId: request.id, orderId: request.orderId })}::jsonb)`;
}
export async function hasPersistentVerifiedReview(orderId: string, lineId: string): Promise<boolean> {
  if (sql === undefined) return false;
  return (
    (
      await sql`SELECT id FROM reviews WHERE order_id = ${orderId} AND line_id = ${lineId} AND verified_purchase = true LIMIT 1`
    ).length > 0
  );
}
export async function saveReview(review: ShopperReview, shopperId: string): Promise<void> {
  if (sql === undefined) return;
  await sql`INSERT INTO reviews (id, order_id, line_id, product_id, shopper_id, rating, title, body, author_display_name, verified_purchase, moderation_status, created_at) VALUES (${review.id}, ${review.orderId}, ${review.lineId}, ${review.productId}, ${shopperId}, ${review.rating}, ${review.title}, ${review.body}, 'Verified shopper', true, 'published', ${review.createdAt})`;
  await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${crypto.randomUUID()}, 'review.published', 'review', ${review.id}, 'local-review', ${JSON.stringify({ reviewId: review.id, productId: review.productId })}::jsonb)`;
}
export async function listPersistentReviews(productId: string): Promise<ShopperReview[]> {
  if (sql === undefined) return [];
  return (
    await sql`SELECT * FROM reviews WHERE product_id = ${productId} AND verified_purchase = true AND moderation_status = 'published' ORDER BY created_at DESC`
  )
    .map(reviewFromRow)
    .filter((review): review is ShopperReview => review !== undefined);
}
export async function saveSupportProposal(proposal: SupportProposal): Promise<void> {
  if (sql !== undefined)
    await sql`INSERT INTO support_proposals (id, shopper_id, order_id, action, summary, constraints_text, command, created_at) VALUES (${proposal.id}, ${proposal.shopperId}, ${proposal.orderId}, ${proposal.action}, ${proposal.summary}, ${proposal.constraints}, ${JSON.stringify(proposal.command)}::jsonb, ${proposal.createdAt})`;
}
export async function getPersistentSupportProposal(
  shopperId: string,
  proposalId: string
): Promise<SupportProposal | undefined> {
  if (sql === undefined) return undefined;
  return supportProposalFromRow(
    (await sql`SELECT * FROM support_proposals WHERE id = ${proposalId} AND shopper_id = ${shopperId}`)[0]
  );
}
export async function confirmPersistentSupportProposal(proposalId: string, confirmedAt: string): Promise<void> {
  if (sql !== undefined) await sql`UPDATE support_proposals SET confirmed_at = ${confirmedAt} WHERE id = ${proposalId}`;
}
export async function readPersistentIdempotencyRecord(
  scope: string,
  actorId: string,
  key: string
): Promise<{ fingerprint: string; response: unknown } | undefined> {
  if (sql === undefined) return undefined;
  const row = (
    await sql`SELECT request_fingerprint, response FROM idempotency_records WHERE scope = ${scope} AND actor_id = ${actorId} AND idempotency_key = ${key}`
  )[0];
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
async function returnFromRow(row: unknown): Promise<ReturnRequest | undefined> {
  if (
    !isRecordObject(row) ||
    typeof row.id !== "string" ||
    typeof row.order_id !== "string" ||
    typeof row.shopper_id !== "string" ||
    typeof row.reason !== "string" ||
    typeof row.state !== "string" ||
    typeof row.refund_status !== "string"
  )
    return undefined;
  const historyRows =
    sql === undefined
      ? []
      : await sql`SELECT status, message, created_at FROM return_history WHERE return_id = ${row.id} ORDER BY created_at`;
  const outboxRows =
    sql === undefined
      ? []
      : await sql`SELECT id FROM outbox_events WHERE aggregate_type = 'return' AND aggregate_id = ${row.id} ORDER BY created_at`;
  const history = historyRows
    .map(historyFromRow)
    .filter((entry): entry is ReturnRequest["history"][number] => entry !== undefined);
  return {
    id: row.id,
    orderId: row.order_id,
    shopperId: row.shopper_id,
    item: row.item_snapshot as ReturnRequest["item"],
    reason: row.reason as ReturnRequest["reason"],
    state: row.state as ReturnRequest["state"],
    refundStatus: row.refund_status as ReturnRequest["refundStatus"],
    createdAt: dateString(row.created_at),
    history,
    auditEvents: history,
    outboxEventIds: outboxRows
      .map((event) => (isRecordObject(event) && typeof event.id === "string" ? event.id : undefined))
      .filter((id): id is string => id !== undefined)
  };
}
function reviewFromRow(row: unknown): ShopperReview | undefined {
  if (
    !isRecordObject(row) ||
    typeof row.id !== "string" ||
    typeof row.order_id !== "string" ||
    typeof row.line_id !== "string" ||
    typeof row.product_id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.body !== "string"
  )
    return undefined;
  return {
    id: row.id,
    orderId: row.order_id,
    lineId: row.line_id,
    productId: row.product_id,
    rating: Number(row.rating),
    title: row.title,
    body: row.body,
    verifiedPurchase: true,
    moderationStatus: "published",
    createdAt: dateString(row.created_at)
  };
}
function supportProposalFromRow(row: unknown): SupportProposal | undefined {
  if (
    !isRecordObject(row) ||
    typeof row.id !== "string" ||
    typeof row.shopper_id !== "string" ||
    typeof row.order_id !== "string" ||
    typeof row.action !== "string" ||
    typeof row.summary !== "string" ||
    typeof row.constraints_text !== "string"
  )
    return undefined;
  return {
    id: row.id,
    shopperId: row.shopper_id,
    orderId: row.order_id,
    action: row.action as SupportProposal["action"],
    summary: row.summary,
    constraints: row.constraints_text,
    command: row.command as SupportProposalCommand,
    createdAt: dateString(row.created_at),
    ...(row.confirmed_at === null ? {} : { confirmedAt: dateString(row.confirmed_at) })
  };
}
function historyFromRow(row: unknown): ReturnRequest["history"][number] | undefined {
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
