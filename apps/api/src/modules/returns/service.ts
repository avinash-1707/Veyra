import type {
  CreateReturnCommand,
  ReturnEligibility,
  ReturnRequest,
  ReviewSubmission,
  ShopperReview,
  SupportProposal,
  SupportProposalCommand
} from "@veyra/contracts";

import {
  advancePersistentReturn,
  confirmPersistentSupportProposal,
  getPersistentReturn,
  getPersistentSupportProposal,
  hasActivePersistentReturn,
  hasPersistentVerifiedReview,
  hasReturnPersistence,
  listPersistentReturns,
  listPersistentReviews,
  readPersistentIdempotencyRecord,
  savePersistentIdempotencyRecord,
  saveReturn,
  saveReview,
  saveSupportProposal
} from "./repository.js";
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

export async function getReturnEligibility(
  shopperId: string,
  orderId: string,
  lineId: string
): Promise<Result<ReturnEligibility>> {
  const order = await getOrder(shopperId, orderId);
  if (order.status !== "ok") return order;
  const line = order.data.items.find((item) => item.cartLineId === lineId);
  if (line === undefined) return { status: "not_found", message: "Order item was not found." };
  if (order.data.status !== "delivered")
    return {
      status: "ok",
      data: {
        orderId,
        lineId,
        eligible: false,
        reason: "Returns are available after simulated delivery.",
        supportedOutcomes: ["refund"]
      }
    };
  const delivered = [...order.data.history].reverse().find((entry) => entry.status === "delivered");
  const deadline = new Date(Date.parse(delivered?.at ?? order.data.createdAt) + returnWindowMs).toISOString();
  if (Date.parse(deadline) < Date.now())
    return {
      status: "ok",
      data: {
        orderId,
        lineId,
        eligible: false,
        reason: "The 30-day simulated return window has expired.",
        deadline,
        supportedOutcomes: ["refund"]
      }
    };
  if (hasReturnPersistence()) {
    if (await hasActivePersistentReturn(orderId, lineId))
      return {
        status: "ok",
        data: {
          orderId,
          lineId,
          eligible: false,
          reason: "A return already exists for this order item.",
          deadline,
          supportedOutcomes: ["refund"]
        }
      };
  } else if (
    [...returns.values()].some(
      (request) =>
        request.orderId === orderId &&
        request.item.cartLineId === lineId &&
        !["rejected", "cancelled"].includes(request.state)
    )
  ) {
    return {
      status: "ok",
      data: {
        orderId,
        lineId,
        eligible: false,
        reason: "A return already exists for this order item.",
        deadline,
        supportedOutcomes: ["refund"]
      }
    };
  }
  return {
    status: "ok",
    data: {
      orderId,
      lineId,
      eligible: true,
      reason: "Eligible for a simulated refund return.",
      deadline,
      supportedOutcomes: ["refund"]
    }
  };
}

export async function createReturn(
  shopperId: string,
  command: CreateReturnCommand,
  idempotencyKey?: string,
  correlationId = "local-return"
): Promise<Result<ReturnRequest>> {
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
    const request: ReturnRequest = {
      id,
      orderId: command.orderId,
      shopperId,
      item,
      reason: command.reason,
      state: "requested",
      refundStatus: "not_started",
      createdAt: now,
      history: [entry],
      auditEvents: [
        { at: now, status: "return.requested", message: "Shopper submitted a policy-eligible return request." }
      ],
      outboxEventIds: [outboxId]
    };
    if (hasReturnPersistence()) {
      await saveReturn(request, correlationId);
    } else {
      outbox.publish({
        id: outboxId,
        type: "return.requested",
        aggregateType: "return",
        aggregateId: id,
        correlationId,
        payload: { orderId: command.orderId, lineId: command.lineId, reason: command.reason }
      });
      returns.set(id, request);
    }
    return { status: "ok", data: request };
  });
}

export async function getReturn(shopperId: string, returnId: string): Promise<Result<ReturnRequest>> {
  if (hasReturnPersistence()) {
    const request = await getPersistentReturn(shopperId, returnId);
    if (request === undefined) return { status: "not_found", message: "Return request was not found." };
    return { status: "ok", data: request };
  }
  const request = returns.get(returnId);
  if (request === undefined || request.shopperId !== shopperId)
    return { status: "not_found", message: "Return request was not found." };
  return { status: "ok", data: request };
}

export async function listReturns(shopperId: string, orderId?: string): Promise<ReturnRequest[]> {
  if (hasReturnPersistence()) return listPersistentReturns(shopperId, orderId);
  return [...returns.values()].filter(
    (request) => request.shopperId === shopperId && (orderId === undefined || request.orderId === orderId)
  );
}

export async function advanceReturnForTests(
  shopperId: string,
  returnId: string,
  correlationId = "local-return-simulation"
): Promise<Result<ReturnRequest>> {
  const found = await getReturn(shopperId, returnId);
  if (found.status !== "ok") return found;
  const request = found.data;
  const transitions = { requested: "received", received: "approved", approved: "refunded" } as const;
  const next = transitions[request.state as keyof typeof transitions];
  if (next === undefined) return { status: "policy_conflict", message: "Return has no further simulated transitions." };
  const now = new Date().toISOString();
  const isRefunded = next === "refunded";
  const eventId = isRefunded ? crypto.randomUUID() : undefined;
  const updated: ReturnRequest = {
    ...request,
    state: next,
    refundStatus: isRefunded ? "refunded" : next === "approved" ? "pending" : request.refundStatus,
    history: [
      ...request.history,
      {
        at: now,
        status: next,
        message:
          next === "received"
            ? "Simulated return received."
            : next === "approved"
              ? "Simulated return approved; refund is pending."
              : "Simulated refund issued to the mock payment method."
      }
    ],
    auditEvents: [
      ...request.auditEvents,
      { at: now, status: `return.${next}`, message: "Local return simulation advanced." }
    ],
    outboxEventIds: eventId === undefined ? request.outboxEventIds : [...request.outboxEventIds, eventId]
  };
  if (hasReturnPersistence()) {
    await advancePersistentReturn(updated, correlationId);
  } else returns.set(request.id, updated);
  return { status: "ok", data: updated };
}

export async function submitReview(
  shopperId: string,
  command: ReviewSubmission,
  idempotencyKey?: string
): Promise<Result<ShopperReview>> {
  return runIdempotent(shopperId, "review", command, idempotencyKey, async () => {
    const order = await getOrder(shopperId, command.orderId);
    if (order.status !== "ok") return order;
    const item = order.data.items.find((line) => line.cartLineId === command.lineId);
    if (item === undefined) return { status: "not_found", message: "Order item was not found." };
    if (order.data.status !== "delivered")
      return { status: "policy_conflict", message: "Verified reviews are available after simulated delivery." };
    if (hasReturnPersistence()) {
      if (await hasPersistentVerifiedReview(command.orderId, command.lineId))
        return { status: "policy_conflict", message: "A verified review already exists for this order item." };
    } else if (
      [...reviews.values()].some((review) => review.orderId === command.orderId && review.lineId === command.lineId)
    )
      return { status: "policy_conflict", message: "A verified review already exists for this order item." };
    const review: ShopperReview = {
      id: crypto.randomUUID(),
      orderId: command.orderId,
      lineId: command.lineId,
      productId: item.productId,
      rating: command.rating,
      title: command.title,
      body: command.body,
      verifiedPurchase: true,
      moderationStatus: "published",
      createdAt: new Date().toISOString()
    };
    if (hasReturnPersistence()) {
      await saveReview(review, shopperId);
    } else {
      reviews.set(review.id, review);
      outbox.publish({
        id: crypto.randomUUID(),
        type: "review.published",
        aggregateType: "review",
        aggregateId: review.id,
        correlationId: "local-review",
        payload: { reviewId: review.id, productId: review.productId }
      });
    }
    return { status: "ok", data: review };
  });
}

export async function listReviews(productId: string): Promise<ShopperReview[]> {
  if (!hasReturnPersistence()) return [...reviews.values()].filter((review) => review.productId === productId);
  return listPersistentReviews(productId);
}

export async function createSupportProposal(
  shopperId: string,
  command: SupportProposalCommand
): Promise<Result<SupportProposal>> {
  const order = await getOrder(shopperId, command.orderId);
  if (order.status !== "ok") return order;
  if (
    (command.action === "return" && (command.lineId === undefined || command.reason === undefined)) ||
    (command.action === "refund" && command.returnId === undefined)
  )
    return {
      status: "validation",
      message: "Provide the item and reason for a return, or the return ID for a refund."
    };
  const proposal: SupportProposal = {
    id: crypto.randomUUID(),
    shopperId,
    orderId: command.orderId,
    action: command.action,
    summary: supportSummary(command.action),
    constraints: supportConstraints(command.action),
    command,
    createdAt: new Date().toISOString()
  };
  if (hasReturnPersistence()) await saveSupportProposal(proposal);
  else proposals.set(proposal.id, proposal);
  return { status: "ok", data: proposal };
}

export async function confirmSupportProposal(
  shopperId: string,
  proposalId: string,
  idempotencyKey?: string,
  correlationId = "local-support"
): Promise<Result<StoredSupportOutcome>> {
  const proposal = await getSupportProposal(shopperId, proposalId);
  if (proposal === undefined) return { status: "not_found", message: "Support proposal was not found." };
  return runIdempotent(shopperId, "support", { proposalId }, idempotencyKey, async () => {
    if (proposal.confirmedAt !== undefined)
      return { status: "ok", data: { proposal, outcome: "This support proposal was already confirmed." } };
    let outcome: string;
    if (proposal.action === "track") {
      const order = await getOrder(shopperId, proposal.orderId);
      if (order.status !== "ok") return order;
      outcome = `Order is currently ${order.data.status}.`;
    } else if (proposal.action === "cancel") {
      const result = await cancelOrder(shopperId, proposal.orderId, correlationId);
      if (result.status !== "ok") return result;
      outcome = "Order cancellation confirmed.";
    } else if (proposal.action === "return") {
      const result = await createReturn(
        shopperId,
        { orderId: proposal.orderId, lineId: proposal.command.lineId!, reason: proposal.command.reason! },
        undefined,
        correlationId
      );
      if (result.status !== "ok") return result;
      outcome = `Return ${result.data.id} requested.`;
    } else {
      const result = await getReturn(shopperId, proposal.command.returnId!);
      if (result.status !== "ok") return result;
      if (result.data.refundStatus !== "refunded")
        return { status: "policy_conflict", message: "Refund is issued only after simulated receipt and approval." };
      outcome = "Refund is already issued to the mock payment method.";
    }
    const confirmed = { ...proposal, confirmedAt: new Date().toISOString() };
    if (hasReturnPersistence()) await confirmPersistentSupportProposal(proposal.id, confirmed.confirmedAt);
    else proposals.set(proposal.id, confirmed);
    return { status: "ok", data: { proposal: confirmed, outcome } };
  });
}

async function runIdempotent<T>(
  shopperId: string,
  scope: string,
  command: unknown,
  key: string | undefined,
  execute: () => Promise<Result<T>>
): Promise<Result<T>> {
  const fingerprint = JSON.stringify(command);
  if (key === undefined || key.trim().length === 0) return execute();
  if (hasReturnPersistence()) {
    const existing = await readPersistentIdempotencyRecord(scope, shopperId, key);
    if (existing !== undefined)
      return existing.fingerprint === fingerprint
        ? (existing.response as Result<T>)
        : { status: "conflict", message: "Idempotency key was reused with a different command." };
    const result = await execute();
    await savePersistentIdempotencyRecord(scope, shopperId, key, fingerprint, result.status, result);
    return result;
  }
  const recordKey = `${shopperId}:${scope}:${key}`;
  const existing = idempotencyRecords.get(recordKey);
  if (existing !== undefined)
    return existing.fingerprint === fingerprint
      ? (existing.result as Result<T>)
      : { status: "conflict", message: "Idempotency key was reused with a different command." };
  const result = await execute();
  idempotencyRecords.set(recordKey, {
    fingerprint,
    result: result as Result<ReturnRequest | ShopperReview | StoredSupportOutcome>
  });
  return result;
}

async function getSupportProposal(shopperId: string, proposalId: string): Promise<SupportProposal | undefined> {
  if (hasReturnPersistence()) return getPersistentSupportProposal(shopperId, proposalId);
  const proposal = proposals.get(proposalId);
  return proposal === undefined || proposal.shopperId !== shopperId ? undefined : proposal;
}
function supportSummary(action: SupportProposalCommand["action"]): string {
  return action === "track"
    ? "Show the current order tracking status."
    : action === "cancel"
      ? "Cancel this order if shipment has not started."
      : action === "return"
        ? "Request a simulated refund return for the selected delivered item."
        : "Check the selected return's simulated refund status.";
}
function supportConstraints(action: SupportProposalCommand["action"]): string {
  return action === "track"
    ? "This reads your owned order only."
    : action === "cancel"
      ? "Cancellation is unavailable after shipment."
      : action === "return"
        ? "The item must be delivered, within 30 days, and have no active return."
        : "A refund follows simulated receipt and approval; no real payment is involved.";
}
