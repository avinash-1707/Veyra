import type { CreateReturnCommand, ReturnEligibility, ReturnRequest, ReviewSubmission, ShopperReview, SupportProposal, SupportProposalCommand } from "@veyra/contracts";

import { getSqlClient } from "../../platform/database.js";
import { InMemoryOutbox } from "../../platform/outbox.js";
import { cancelOrder, getOrder, type CommandResult } from "../orders/orders.js";

const returnWindowMs = 30 * 24 * 60 * 60 * 1_000;
type Result<T> = CommandResult<T>;
type IdempotencyRecord<T> = { fingerprint: string; result: Result<T> };
type StoredSupportOutcome = { proposal: SupportProposal; outcome: string };

const returns = new Map<string, ReturnRequest>();
const reviews = new Map<string, ShopperReview>();
const proposals = new Map<string, SupportProposal>();
const idempotencyRecords = new Map<string, IdempotencyRecord<ReturnRequest | ShopperReview | StoredSupportOutcome>>();
const outbox = new InMemoryOutbox();

export function resetReturnsForTests(): void {
  returns.clear();
  reviews.clear();
  proposals.clear();
  idempotencyRecords.clear();
}

export async function getReturnEligibility(shopperId: string, orderId: string, lineId: string): Promise<Result<ReturnEligibility>> {
  const order = await getOrder(shopperId, orderId);
  if (order.status !== "ok") return order;
  const line = order.data.items.find((item) => item.cartLineId === lineId);
  if (line === undefined) return { status: "not_found", message: "Order item was not found." };
  if (order.data.status !== "delivered") return { status: "ok", data: { orderId, lineId, eligible: false, reason: "Returns are available after simulated delivery.", supportedOutcomes: ["refund"] } };
  const delivered = [...order.data.history].reverse().find((entry) => entry.status === "delivered");
  const deadline = new Date(Date.parse(delivered?.at ?? order.data.createdAt) + returnWindowMs).toISOString();
  if (Date.parse(deadline) < Date.now()) return { status: "ok", data: { orderId, lineId, eligible: false, reason: "The 30-day simulated return window has expired.", deadline, supportedOutcomes: ["refund"] } };
  const sql = getSqlClient();
  if (sql !== undefined) {
    const existing = await sql`SELECT id FROM return_requests WHERE order_id = ${orderId} AND line_id = ${lineId} AND state NOT IN ('rejected', 'cancelled') LIMIT 1`;
    if (existing.length > 0) return { status: "ok", data: { orderId, lineId, eligible: false, reason: "A return already exists for this order item.", deadline, supportedOutcomes: ["refund"] } };
  } else if ([...returns.values()].some((request) => request.orderId === orderId && request.item.cartLineId === lineId && !["rejected", "cancelled"].includes(request.state))) {
    return { status: "ok", data: { orderId, lineId, eligible: false, reason: "A return already exists for this order item.", deadline, supportedOutcomes: ["refund"] } };
  }
  return { status: "ok", data: { orderId, lineId, eligible: true, reason: "Eligible for a simulated refund return.", deadline, supportedOutcomes: ["refund"] } };
}

export async function createReturn(shopperId: string, command: CreateReturnCommand, idempotencyKey?: string, correlationId = "local-return"): Promise<Result<ReturnRequest>> {
  return runIdempotent(shopperId, "return", command, idempotencyKey, async () => {
    const eligibility = await getReturnEligibility(shopperId, command.orderId, command.lineId);
    if (eligibility.status !== "ok") return eligibility;
    if (!eligibility.data.eligible) return { status: "policy_conflict", message: eligibility.data.reason };
    const order = await getOrder(shopperId, command.orderId);
    if (order.status !== "ok") return order;
    const item = order.data.items.find((line) => line.cartLineId === command.lineId);
    if (item === undefined) return { status: "not_found", message: "Order item was not found." };
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const entry = { at: now, status: "requested", message: "Return requested for a simulated refund." };
    const request: ReturnRequest = { id, orderId: command.orderId, shopperId, item, reason: command.reason, state: "requested", refundStatus: "not_started", createdAt: now, history: [entry], auditEvents: [{ at: now, status: "return.requested", message: "Shopper submitted a policy-eligible return request." }], outboxEventIds: [outboxId] };
    const sql = getSqlClient();
    if (sql !== undefined) {
      await sql`INSERT INTO return_requests (id, order_id, shopper_id, line_id, item_snapshot, reason, state, refund_status, created_at) VALUES (${id}, ${command.orderId}, ${shopperId}, ${command.lineId}, ${JSON.stringify(item)}::jsonb, ${command.reason}, 'requested', 'not_started', ${now})`;
      await sql`INSERT INTO return_history (return_id, status, message, created_at) VALUES (${id}, 'requested', 'Return requested for a simulated refund.', ${now})`;
      await sql`INSERT INTO audit_events (actor_id, aggregate_type, aggregate_id, status, message, created_at) VALUES (${shopperId}, 'return', ${id}, 'return.requested', 'Shopper submitted a policy-eligible return request.', ${now})`;
      await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${outboxId}, 'return.requested', 'return', ${id}, ${correlationId}, ${JSON.stringify({ orderId: command.orderId, lineId: command.lineId, reason: command.reason })}::jsonb)`;
    } else {
      outbox.publish({ id: outboxId, type: "return.requested", aggregateType: "return", aggregateId: id, correlationId, payload: { orderId: command.orderId, lineId: command.lineId, reason: command.reason } });
      returns.set(id, request);
    }
    return { status: "ok", data: request };
  });
}

export async function getReturn(shopperId: string, returnId: string): Promise<Result<ReturnRequest>> {
  const sql = getSqlClient();
  if (sql !== undefined) {
    const rows = await sql`SELECT * FROM return_requests WHERE id = ${returnId} AND shopper_id = ${shopperId}`;
    const request = await returnFromRow(rows[0]);
    if (request === undefined) return { status: "not_found", message: "Return request was not found." };
    return { status: "ok", data: request };
  }
  const request = returns.get(returnId);
  if (request === undefined || request.shopperId !== shopperId) return { status: "not_found", message: "Return request was not found." };
  return { status: "ok", data: request };
}

export async function listReturns(shopperId: string, orderId?: string): Promise<ReturnRequest[]> {
  const sql = getSqlClient();
  if (sql !== undefined) {
    const rows = orderId === undefined ? await sql`SELECT * FROM return_requests WHERE shopper_id = ${shopperId} ORDER BY created_at DESC` : await sql`SELECT * FROM return_requests WHERE shopper_id = ${shopperId} AND order_id = ${orderId} ORDER BY created_at DESC`;
    const parsed = await Promise.all(rows.map(returnFromRow));
    return parsed.filter((request): request is ReturnRequest => request !== undefined);
  }
  return [...returns.values()].filter((request) => request.shopperId === shopperId && (orderId === undefined || request.orderId === orderId));
}

export async function advanceReturnForTests(shopperId: string, returnId: string, correlationId = "local-return-simulation"): Promise<Result<ReturnRequest>> {
  const found = await getReturn(shopperId, returnId);
  if (found.status !== "ok") return found;
  const request = found.data;
  const transitions = { requested: "received", received: "approved", approved: "refunded" } as const;
  const next = transitions[request.state as keyof typeof transitions];
  if (next === undefined) return { status: "policy_conflict", message: "Return has no further simulated transitions." };
  const now = new Date().toISOString();
  const isRefunded = next === "refunded";
  const eventId = isRefunded ? crypto.randomUUID() : undefined;
  const updated: ReturnRequest = { ...request, state: next, refundStatus: isRefunded ? "refunded" : next === "approved" ? "pending" : request.refundStatus, history: [...request.history, { at: now, status: next, message: next === "received" ? "Simulated return received." : next === "approved" ? "Simulated return approved; refund is pending." : "Simulated refund issued to the mock payment method." }], auditEvents: [...request.auditEvents, { at: now, status: `return.${next}`, message: "Local return simulation advanced." }], outboxEventIds: eventId === undefined ? request.outboxEventIds : [...request.outboxEventIds, eventId] };
  const sql = getSqlClient();
  if (sql !== undefined) {
    await sql`UPDATE return_requests SET state = ${next}, refund_status = ${updated.refundStatus} WHERE id = ${returnId}`;
    await sql`INSERT INTO return_history (return_id, status, message, created_at) VALUES (${returnId}, ${next}, ${updated.history.at(-1)?.message ?? "Return advanced."}, ${now})`;
    if (isRefunded && eventId !== undefined) await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${eventId}, 'return.refunded', 'return', ${returnId}, ${correlationId}, ${JSON.stringify({ returnId, orderId: request.orderId })}::jsonb)`;
  } else returns.set(request.id, updated);
  return { status: "ok", data: updated };
}

export async function submitReview(shopperId: string, command: ReviewSubmission, idempotencyKey?: string): Promise<Result<ShopperReview>> {
  return runIdempotent(shopperId, "review", command, idempotencyKey, async () => {
    const order = await getOrder(shopperId, command.orderId);
    if (order.status !== "ok") return order;
    const item = order.data.items.find((line) => line.cartLineId === command.lineId);
    if (item === undefined) return { status: "not_found", message: "Order item was not found." };
    if (order.data.status !== "delivered") return { status: "policy_conflict", message: "Verified reviews are available after simulated delivery." };
    const sql = getSqlClient();
    if (sql !== undefined) {
      const existing = await sql`SELECT id FROM reviews WHERE order_id = ${command.orderId} AND line_id = ${command.lineId} AND verified_purchase = true LIMIT 1`;
      if (existing.length > 0) return { status: "policy_conflict", message: "A verified review already exists for this order item." };
    } else if ([...reviews.values()].some((review) => review.orderId === command.orderId && review.lineId === command.lineId)) return { status: "policy_conflict", message: "A verified review already exists for this order item." };
    const review: ShopperReview = { id: crypto.randomUUID(), orderId: command.orderId, lineId: command.lineId, productId: item.productId, rating: command.rating, title: command.title, body: command.body, verifiedPurchase: true, moderationStatus: "published", createdAt: new Date().toISOString() };
    if (sql !== undefined) {
      await sql`INSERT INTO reviews (id, order_id, line_id, product_id, shopper_id, rating, title, body, author_display_name, verified_purchase, moderation_status, created_at) VALUES (${review.id}, ${review.orderId}, ${review.lineId}, ${review.productId}, ${shopperId}, ${review.rating}, ${review.title}, ${review.body}, 'Verified shopper', true, 'published', ${review.createdAt})`;
      await sql`INSERT INTO outbox_events (id, type, aggregate_type, aggregate_id, correlation_id, payload) VALUES (${crypto.randomUUID()}, 'review.published', 'review', ${review.id}, 'local-review', ${JSON.stringify({ reviewId: review.id, productId: review.productId })}::jsonb)`;
    } else {
      reviews.set(review.id, review);
      outbox.publish({ id: crypto.randomUUID(), type: "review.published", aggregateType: "review", aggregateId: review.id, correlationId: "local-review", payload: { reviewId: review.id, productId: review.productId } });
    }
    return { status: "ok", data: review };
  });
}

export async function listReviews(productId: string): Promise<ShopperReview[]> {
  const sql = getSqlClient();
  if (sql === undefined) return [...reviews.values()].filter((review) => review.productId === productId);
  const rows = await sql`SELECT * FROM reviews WHERE product_id = ${productId} AND verified_purchase = true AND moderation_status = 'published' ORDER BY created_at DESC`;
  return rows.map(reviewFromRow).filter((review): review is ShopperReview => review !== undefined);
}

export async function createSupportProposal(shopperId: string, command: SupportProposalCommand): Promise<Result<SupportProposal>> {
  const order = await getOrder(shopperId, command.orderId);
  if (order.status !== "ok") return order;
  if ((command.action === "return" && (command.lineId === undefined || command.reason === undefined)) || (command.action === "refund" && command.returnId === undefined)) return { status: "validation", message: "Provide the item and reason for a return, or the return ID for a refund." };
  const proposal: SupportProposal = { id: crypto.randomUUID(), shopperId, orderId: command.orderId, action: command.action, summary: supportSummary(command.action), constraints: supportConstraints(command.action), command, createdAt: new Date().toISOString() };
  const sql = getSqlClient();
  if (sql !== undefined) await sql`INSERT INTO support_proposals (id, shopper_id, order_id, action, summary, constraints_text, command, created_at) VALUES (${proposal.id}, ${shopperId}, ${proposal.orderId}, ${proposal.action}, ${proposal.summary}, ${proposal.constraints}, ${JSON.stringify(proposal.command)}::jsonb, ${proposal.createdAt})`;
  else proposals.set(proposal.id, proposal);
  return { status: "ok", data: proposal };
}

export async function confirmSupportProposal(shopperId: string, proposalId: string, idempotencyKey?: string, correlationId = "local-support"): Promise<Result<StoredSupportOutcome>> {
  const proposal = await getSupportProposal(shopperId, proposalId);
  if (proposal === undefined) return { status: "not_found", message: "Support proposal was not found." };
  return runIdempotent(shopperId, "support", { proposalId }, idempotencyKey, async () => {
    if (proposal.confirmedAt !== undefined) return { status: "ok", data: { proposal, outcome: "This support proposal was already confirmed." } };
    let outcome: string;
    if (proposal.action === "track") { const order = await getOrder(shopperId, proposal.orderId); if (order.status !== "ok") return order; outcome = `Order is currently ${order.data.status}.`; }
    else if (proposal.action === "cancel") { const result = await cancelOrder(shopperId, proposal.orderId, correlationId); if (result.status !== "ok") return result; outcome = "Order cancellation confirmed."; }
    else if (proposal.action === "return") { const result = await createReturn(shopperId, { orderId: proposal.orderId, lineId: proposal.command.lineId!, reason: proposal.command.reason! }, undefined, correlationId); if (result.status !== "ok") return result; outcome = `Return ${result.data.id} requested.`; }
    else { const result = await getReturn(shopperId, proposal.command.returnId!); if (result.status !== "ok") return result; if (result.data.refundStatus !== "refunded") return { status: "policy_conflict", message: "Refund is issued only after simulated receipt and approval." }; outcome = "Refund is already issued to the mock payment method."; }
    const confirmed = { ...proposal, confirmedAt: new Date().toISOString() };
    const sql = getSqlClient();
    if (sql !== undefined) await sql`UPDATE support_proposals SET confirmed_at = ${confirmed.confirmedAt} WHERE id = ${proposal.id}`;
    else proposals.set(proposal.id, confirmed);
    return { status: "ok", data: { proposal: confirmed, outcome } };
  });
}

async function runIdempotent<T>(shopperId: string, scope: string, command: unknown, key: string | undefined, execute: () => Promise<Result<T>>): Promise<Result<T>> {
  const sql = getSqlClient();
  const fingerprint = JSON.stringify(command);
  if (key === undefined || key.trim().length === 0) return execute();
  if (sql !== undefined) {
    const existing = await sql`SELECT request_fingerprint, response FROM idempotency_records WHERE scope = ${scope} AND actor_id = ${shopperId} AND idempotency_key = ${key}`;
    const record = existing[0];
    if (isRecordObject(record)) return record.request_fingerprint === fingerprint ? record.response as Result<T> : { status: "conflict", message: "Idempotency key was reused with a different command." };
    const result = await execute();
    await sql`INSERT INTO idempotency_records (scope, actor_id, idempotency_key, request_fingerprint, status, response) VALUES (${scope}, ${shopperId}, ${key}, ${fingerprint}, ${result.status}, ${JSON.stringify(result)}::jsonb)`;
    return result;
  }
  const recordKey = `${shopperId}:${scope}:${key}`;
  const existing = idempotencyRecords.get(recordKey);
  if (existing !== undefined) return existing.fingerprint === fingerprint ? existing.result as Result<T> : { status: "conflict", message: "Idempotency key was reused with a different command." };
  const result = await execute();
  idempotencyRecords.set(recordKey, { fingerprint, result: result as Result<ReturnRequest | ShopperReview | StoredSupportOutcome> });
  return result;
}

async function returnFromRow(row: unknown): Promise<ReturnRequest | undefined> {
  if (!isRecordObject(row) || typeof row.id !== "string" || typeof row.order_id !== "string" || typeof row.shopper_id !== "string" || typeof row.line_id !== "string" || typeof row.reason !== "string" || typeof row.state !== "string" || typeof row.refund_status !== "string") return undefined;
  const sql = getSqlClient();
  const historyRows = sql === undefined ? [] : await sql`SELECT status, message, created_at FROM return_history WHERE return_id = ${row.id} ORDER BY created_at`;
  const outboxRows = sql === undefined ? [] : await sql`SELECT id FROM outbox_events WHERE aggregate_type = 'return' AND aggregate_id = ${row.id} ORDER BY created_at`;
  const history = historyRows.map(historyFromRow).filter((entry): entry is ReturnRequest["history"][number] => entry !== undefined);
  return { id: row.id, orderId: row.order_id, shopperId: row.shopper_id, item: row.item_snapshot as ReturnRequest["item"], reason: row.reason as ReturnRequest["reason"], state: row.state as ReturnRequest["state"], refundStatus: row.refund_status as ReturnRequest["refundStatus"], createdAt: dateString(row.created_at), history, auditEvents: history, outboxEventIds: outboxRows.map((event) => isRecordObject(event) && typeof event.id === "string" ? event.id : undefined).filter((id): id is string => id !== undefined) };
}

function reviewFromRow(row: unknown): ShopperReview | undefined {
  if (!isRecordObject(row) || typeof row.id !== "string" || typeof row.order_id !== "string" || typeof row.line_id !== "string" || typeof row.product_id !== "string" || typeof row.title !== "string" || typeof row.body !== "string") return undefined;
  return { id: row.id, orderId: row.order_id, lineId: row.line_id, productId: row.product_id, rating: Number(row.rating), title: row.title, body: row.body, verifiedPurchase: true, moderationStatus: "published", createdAt: dateString(row.created_at) };
}

async function getSupportProposal(shopperId: string, proposalId: string): Promise<SupportProposal | undefined> {
  const sql = getSqlClient();
  if (sql === undefined) {
    const proposal = proposals.get(proposalId);
    return proposal === undefined || proposal.shopperId !== shopperId ? undefined : proposal;
  }
  const rows = await sql`SELECT * FROM support_proposals WHERE id = ${proposalId} AND shopper_id = ${shopperId}`;
  const row = rows[0];
  if (!isRecordObject(row) || typeof row.id !== "string" || typeof row.shopper_id !== "string" || typeof row.order_id !== "string" || typeof row.action !== "string" || typeof row.summary !== "string" || typeof row.constraints_text !== "string") return undefined;
  return { id: row.id, shopperId: row.shopper_id, orderId: row.order_id, action: row.action as SupportProposal["action"], summary: row.summary, constraints: row.constraints_text, command: row.command as SupportProposalCommand, createdAt: dateString(row.created_at), ...(row.confirmed_at === null ? {} : { confirmedAt: dateString(row.confirmed_at) }) };
}

function historyFromRow(row: unknown): ReturnRequest["history"][number] | undefined {
  if (!isRecordObject(row) || typeof row.status !== "string" || typeof row.message !== "string") return undefined;
  return { at: dateString(row.created_at), status: row.status, message: row.message };
}
function isRecordObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function dateString(value: unknown): string { return value instanceof Date ? value.toISOString() : typeof value === "string" ? new Date(value).toISOString() : new Date().toISOString(); }
function supportSummary(action: SupportProposalCommand["action"]): string { return action === "track" ? "Show the current order tracking status." : action === "cancel" ? "Cancel this order if shipment has not started." : action === "return" ? "Request a simulated refund return for the selected delivered item." : "Check the selected return's simulated refund status."; }
function supportConstraints(action: SupportProposalCommand["action"]): string { return action === "track" ? "This reads your owned order only." : action === "cancel" ? "Cancellation is unavailable after shipment." : action === "return" ? "The item must be delivered, within 30 days, and have no active return." : "A refund follows simulated receipt and approval; no real payment is involved."; }
