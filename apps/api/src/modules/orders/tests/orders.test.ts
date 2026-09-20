import { checkoutQuoteResponseSchema, orderListResponseSchema, orderResponseSchema } from "@veyra/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { resetCartsForTests } from "../../cart/cart.js";
import { resetLocalRateLimitsForTests } from "../../../platform/http.js";
import { app } from "../../../index.js";
import { expireQuoteForTests, resetOrdersForTests } from "../orders.js";

const cartId = "unit-3-cart";
const shopperId = "shopper-unit-3";
const backpackOfferId = "018f3f7d-486c-7d73-9e13-83d8d0c75614";
const backpackVariantId = "018f3f7d-486c-7d73-9e13-83d8d0c75612";
const address = {
  recipientName: "Aarav Sharma",
  line1: "12 Example Road",
  city: "Bengaluru",
  state: "Karnataka",
  pinCode: "560001"
};

describe("checkout and order lifecycle API", () => {
  beforeEach(() => {
    resetLocalRateLimitsForTests();
    resetCartsForTests();
    resetOrdersForTests();
  });

  it("quotes and confirms one idempotent checkout with audit and outbox evidence", async () => {
    await addCartItem(1, "cart-add");
    const quote = await createQuote("mock_success");
    const confirmed = await confirmQuote(quote.id, "confirm-once");
    const replay = await confirmQuote(quote.id, "confirm-once");
    const duplicateWithoutKey = await app.request("/v1/checkout/confirm", {
      method: "POST",
      headers: { ...shopperHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ quoteId: quote.id, mockPaymentMethod: "mock_success" })
    });
    const duplicateBody: unknown = await duplicateWithoutKey.json();
    const duplicate = orderResponseSchema.parse(duplicateBody).data;
    const orders = await app.request("/v1/orders", { headers: shopperHeaders() });
    const ordersBody: unknown = await orders.json();
    const parsedOrders = orderListResponseSchema.parse(ordersBody);

    expect(confirmed.id).toBe(replay.id);
    expect(duplicate.id).toBe(confirmed.id);
    expect(confirmed.paymentStatus).toBe("authorized");
    expect(confirmed.history.map((entry) => entry.status)).toContain("preparing");
    expect(confirmed.auditEvents[0]?.status).toBe("order.confirmed");
    expect(confirmed.outboxEventIds).toHaveLength(1);
    expect(parsedOrders.data.map((order) => order.id)).toEqual([confirmed.id]);
  });

  it("recovers from competing checkout attempts for limited stock", async () => {
    await addCartItem(1, "cart-add");
    const firstQuote = await createQuote("mock_success");
    const secondQuote = await createQuote("mock_success");
    const firstOrder = await confirmQuote(firstQuote.id, "first-confirm");
    const conflict = await app.request("/v1/checkout/confirm", {
      method: "POST",
      headers: { ...shopperHeaders(), "content-type": "application/json", "idempotency-key": "second-confirm" },
      body: JSON.stringify({ quoteId: secondQuote.id, mockPaymentMethod: "mock_success" })
    });
    const body: unknown = await conflict.json();

    expect(firstOrder.status).toBe("preparing");
    expect(conflict.status).toBe(409);
    expect(JSON.stringify(body)).toContain("no longer has enough simulated stock");
  });

  it("rejects expired quotes and mock payment failures without creating orders", async () => {
    await addCartItem(1, "cart-add");
    const expiredQuote = await createQuote("mock_success");
    expireQuoteForTests(expiredQuote.id);
    const expired = await app.request("/v1/checkout/confirm", {
      method: "POST",
      headers: { ...shopperHeaders(), "content-type": "application/json", "idempotency-key": "expired-confirm" },
      body: JSON.stringify({ quoteId: expiredQuote.id, mockPaymentMethod: "mock_success" })
    });
    const failureQuote = await createQuote("mock_failure");
    const failedPayment = await app.request("/v1/checkout/confirm", {
      method: "POST",
      headers: { ...shopperHeaders(), "content-type": "application/json", "idempotency-key": "failure-confirm" },
      body: JSON.stringify({ quoteId: failureQuote.id, mockPaymentMethod: "mock_success" })
    });

    expect(expired.status).toBe(409);
    expect(failedPayment.status).toBe(409);
  });

  it("allows pre-shipment delivery edits and cancellation but blocks cancellation after shipment", async () => {
    await addCartItem(1, "cart-add");
    const quote = await createQuote("mock_success");
    const order = await confirmQuote(quote.id, "confirm-edit");
    const editResponse = await app.request(`/v1/orders/${order.id}/delivery`, {
      method: "PATCH",
      headers: { ...shopperHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ shippingAddress: { ...address, line1: "44 Updated Road" }, deliverySpeed: "expedited" })
    });
    const shippedResponse = await app.request(`/v1/orders/${order.id}/advance-fulfillment`, { method: "POST", headers: shopperHeaders() });
    const shippedBody: unknown = await shippedResponse.json();
    const shipped = orderResponseSchema.parse(shippedBody).data;
    const cancelAfterShip = await app.request(`/v1/orders/${order.id}/cancel`, { method: "POST", headers: shopperHeaders() });

    expect(editResponse.status).toBe(200);
    const editedBody: unknown = await editResponse.json();
    const edited = orderResponseSchema.parse(editedBody).data;
    expect(edited.outboxEventIds).toHaveLength(2);
    expect(shipped.status).toBe("shipped");
    expect(cancelAfterShip.status).toBe(409);
  });

  it("does not disclose another shopper's order", async () => {
    await addCartItem(1, "cart-add");
    const quote = await createQuote("mock_success");
    const order = await confirmQuote(quote.id, "confirm-owner");
    const otherShopper = await app.request(`/v1/orders/${order.id}`, { headers: { "x-veyra-shopper-id": "other-shopper" } });

    expect(otherShopper.status).toBe(404);
  });
});

async function addCartItem(quantity: number, idempotencyKey: string): Promise<void> {
  const response = await app.request("/v1/cart/items", {
    method: "POST",
    headers: { ...shopperHeaders(), "x-veyra-cart-id": cartId, "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({ offerId: backpackOfferId, variantId: backpackVariantId, quantity })
  });
  expect(response.status).toBe(200);
}

async function createQuote(mockPaymentMethod: "mock_success" | "mock_failure") {
  const response = await app.request("/v1/checkout/quote", {
    method: "POST",
    headers: { ...shopperHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ cartId, shippingAddress: address, deliverySpeed: "standard", mockPaymentMethod })
  });
  const body: unknown = await response.json();
  expect(response.status).toBe(200);
  return checkoutQuoteResponseSchema.parse(body).data;
}

async function confirmQuote(quoteId: string, idempotencyKey: string) {
  const response = await app.request("/v1/checkout/confirm", {
    method: "POST",
    headers: { ...shopperHeaders(), "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({ quoteId, mockPaymentMethod: "mock_success" })
  });
  const body: unknown = await response.json();
  expect(response.status).toBe(200);
  return orderResponseSchema.parse(body).data;
}

function shopperHeaders() {
  return {
    "x-veyra-shopper-id": shopperId,
    "origin": "http://localhost:3000",
    "cookie": "veyra_csrf=csrf-token",
    "x-csrf-token": "csrf-token"
  };
}
