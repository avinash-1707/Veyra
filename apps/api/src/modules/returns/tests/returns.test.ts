import {
  checkoutQuoteResponseSchema,
  orderResponseSchema,
  returnResponseSchema,
  reviewResponseSchema,
  supportConfirmationResponseSchema,
  supportProposalResponseSchema
} from "@veyra/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { app } from "../../../index.js";
import { authenticatedShopperHeaders, authenticatedShopperId } from "../../../tests/auth.js";
import { resetCartsForTests } from "../../cart/cart.js";
import { expireDeliveredOrderForTests, resetOrdersForTests } from "../../orders/orders.js";
import { advanceReturnForTests, resetReturnsForTests } from "../returns.js";
import { resetLocalRateLimitsForTests } from "../../../platform/http.js";

let authenticatedHeaders: Record<string, string>;
let shopperId: string;
const cartId = "unit-4-cart";
const offerId = "018f3f7d-486c-7d73-9e13-83d8d0c75614";
const variantId = "018f3f7d-486c-7d73-9e13-83d8d0c75612";
const address = {
  recipientName: "Aarav Sharma",
  line1: "12 Example Road",
  city: "Bengaluru",
  state: "Karnataka",
  pinCode: "560001"
};

describe("returns, reviews, and deterministic support API", () => {
  beforeEach(async () => {
    resetLocalRateLimitsForTests();
    resetCartsForTests();
    resetOrdersForTests();
    resetReturnsForTests();
    authenticatedHeaders = await authenticatedShopperHeaders();
    shopperId = await authenticatedShopperId(authenticatedHeaders);
  });

  it("accepts one delivered-item return and advances its simulated refund timeline", async () => {
    const order = await deliveredOrder();
    const lineId = order.items[0]!.cartLineId;
    const eligibility = await app.request(`/v1/orders/${order.id}/items/${lineId}/return-eligibility`, {
      headers: headers()
    });
    const eligibilityBody: unknown = await eligibility.json();
    expect(eligibility.status).toBe(200);
    expect(JSON.stringify(eligibilityBody)).toContain('"eligible":true');

    const created = await app.request("/v1/returns", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json", "idempotency-key": "return-once" },
      body: JSON.stringify({ orderId: order.id, lineId, reason: "damaged" })
    });
    const createdBody: unknown = await created.json();
    const request = returnResponseSchema.parse(createdBody).data;
    const replay = await app.request("/v1/returns", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json", "idempotency-key": "return-once" },
      body: JSON.stringify({ orderId: order.id, lineId, reason: "damaged" })
    });
    const replayBody: unknown = await replay.json();

    expect(returnResponseSchema.parse(replayBody).data.id).toBe(request.id);
    for (const state of ["received", "approved", "refunded"]) {
      const advanced = await advanceReturnForTests(shopperId, request.id);
      expect(advanced.status).toBe("ok");
      if (advanced.status === "ok") expect(advanced.data.state).toBe(state);
    }
  });

  it("denies expired return eligibility", async () => {
    const order = await deliveredOrder();
    await expireDeliveredOrderForTests(order.id);
    const response = await app.request(
      `/v1/orders/${order.id}/items/${order.items[0]!.cartLineId}/return-eligibility`,
      { headers: headers() }
    );
    expect(JSON.stringify(await response.json())).toContain("30-day simulated return window has expired");
  });

  it("denies cross-shopper, duplicate, and pre-delivery post-purchase actions", async () => {
    const pending = await createOrder();
    const lineId = pending.items[0]!.cartLineId;
    const review = await app.request("/v1/reviews", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({ orderId: pending.id, lineId, rating: 5, title: "Great", body: "Works well." })
    });
    const forgedHeader = await app.request(`/v1/orders/${pending.id}/items/${lineId}/return-eligibility`, {
      headers: { ...headers(), "x-veyra-shopper-id": "other-shopper" }
    });
    expect(review.status).toBe(409);
    expect(forgedHeader.status).toBe(200);

    const delivered = await deliver(pending.id);
    const submitted = await app.request("/v1/reviews", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json", "idempotency-key": "review-once" },
      body: JSON.stringify({ orderId: delivered.id, lineId, rating: 5, title: "Great", body: "Works well." })
    });
    const submittedBody: unknown = await submitted.json();
    expect(reviewResponseSchema.parse(submittedBody).data.verifiedPurchase).toBe(true);
    const duplicate = await app.request("/v1/reviews", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({ orderId: delivered.id, lineId, rating: 4, title: "Again", body: "Second review." })
    });
    expect(duplicate.status).toBe(409);
  });

  it("requires an explicit, replay-safe support confirmation for return actions", async () => {
    const order = await deliveredOrder();
    const lineId = order.items[0]!.cartLineId;
    const proposalResponse = await app.request("/v1/support/proposals", {
      method: "POST",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, action: "return", lineId, reason: "not_as_described" })
    });
    const proposalBody: unknown = await proposalResponse.json();
    const proposal = supportProposalResponseSchema.parse(proposalBody).data;
    const beforeConfirm = await app.request(`/v1/orders/${order.id}/returns`, { headers: headers() });
    expect(JSON.stringify(await beforeConfirm.json())).toContain('"items":[]');

    const confirmed = await app.request(`/v1/support/proposals/${proposal.id}/confirm`, {
      method: "POST",
      headers: { ...headers(), "idempotency-key": "support-confirm" }
    });
    const confirmedBody: unknown = await confirmed.json();
    const replay = await app.request(`/v1/support/proposals/${proposal.id}/confirm`, {
      method: "POST",
      headers: { ...headers(), "idempotency-key": "support-confirm" }
    });
    const replayBody: unknown = await replay.json();
    expect(supportConfirmationResponseSchema.parse(confirmedBody).data.outcome).toContain("requested");
    expect(supportConfirmationResponseSchema.parse(replayBody).data.outcome).toContain("requested");
  });
});

async function deliveredOrder() {
  return deliver((await createOrder()).id);
}
async function deliver(orderId: string) {
  await app.request(`/v1/orders/${orderId}/advance-fulfillment`, { method: "POST", headers: headers() });
  const response = await app.request(`/v1/orders/${orderId}/advance-fulfillment`, {
    method: "POST",
    headers: headers()
  });
  return orderResponseSchema.parse((await response.json()) as unknown).data;
}
async function createOrder() {
  const added = await app.request("/v1/cart/items", {
    method: "POST",
    headers: {
      ...headers(),
      "x-veyra-cart-id": cartId,
      "content-type": "application/json",
      "idempotency-key": crypto.randomUUID()
    },
    body: JSON.stringify({ offerId, variantId, quantity: 1 })
  });
  expect(added.status).toBe(200);
  const quoteResponse = await app.request("/v1/checkout/quote", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({
      cartId,
      shippingAddress: address,
      deliverySpeed: "standard",
      mockPaymentMethod: "mock_success"
    })
  });
  const quote = checkoutQuoteResponseSchema.parse((await quoteResponse.json()) as unknown).data;
  const confirmed = await app.request("/v1/checkout/confirm", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify({ quoteId: quote.id, mockPaymentMethod: "mock_success" })
  });
  return orderResponseSchema.parse((await confirmed.json()) as unknown).data;
}
function headers() {
  return authenticatedHeaders;
}
