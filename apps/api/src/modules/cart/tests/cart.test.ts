import { cartResponseSchema, compareResponseSchema, evaluationResponseSchema } from "@veyra/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { resetLocalRateLimitsForTests } from "../../../platform/http.js";
import { app } from "../../../index.js";
import { resetCartsForTests, resetPersistentCartsForTests } from "../cart.js";

const cartId = "unit-2-cart";
const backpackOfferId = "018f3f7d-486c-7d73-9e13-83d8d0c75614";
const backpackVariantId = "018f3f7d-486c-7d73-9e13-83d8d0c75612";
const withdrawnOfferId = "018f3f7d-5b68-7aef-9e10-2d890fc8a615";
const earbudsVariantId = "018f3f7d-5b68-7aef-9e10-2d890fc8a613";

describe("evaluation and cart API", () => {
  beforeEach(async () => {
    resetLocalRateLimitsForTests();
    resetCartsForTests();
    await resetPersistentCartsForTests(cartId);
  });

  it("compares up to three normalized factsheets and keeps missing data explicit", async () => {
    const response = await app.request("/v1/compare?products=veyra-everyday-backpack,veyra-noise-isolating-earbuds");
    const body: unknown = await response.json();
    const parsed = compareResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data.products).toHaveLength(2);
    expect(parsed.data.fieldOrder).toContain("Battery");
    expect(parsed.data.products[0]?.specifications.Battery).toBeUndefined();
  });

  it("returns reviews questions and related products for evaluation", async () => {
    const response = await app.request("/v1/products/veyra-everyday-backpack/evaluation");
    const body: unknown = await response.json();
    const parsed = evaluationResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data.reviews[0]?.verifiedPurchase).toBe(true);
    expect(parsed.data.questions[0]?.answer).toContain("stands upright");
  });

  it("adds same product different offers as offer and variant keyed cart lines", async () => {
    const first = await addBackpack("line-one", backpackOfferId, backpackVariantId, 1);
    const second = await addBackpack(
      "line-two",
      "018f3f7d-486c-7d73-9e13-83d8d0c75615",
      "018f3f7d-486c-7d73-9e13-83d8d0c75613",
      1
    );
    const secondBody: unknown = await second.json();
    const parsed = cartResponseSchema.parse(secondBody);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(parsed.data.items.map((item) => item.product.selectedOffer.id)).toEqual([
      backpackOfferId,
      "018f3f7d-486c-7d73-9e13-83d8d0c75615"
    ]);
  });

  it("replays duplicate cart commands without adding quantity twice", async () => {
    await addBackpack("replay-key", backpackOfferId, backpackVariantId, 2);
    const replay = await addBackpack("replay-key", backpackOfferId, backpackVariantId, 2);
    const body: unknown = await replay.json();
    const parsed = cartResponseSchema.parse(body);

    expect(replay.status).toBe(200);
    expect(parsed.data.items[0]?.quantity).toBe(2);
  });

  it("blocks unavailable offers and exposes server money invariants", async () => {
    const unavailable = await addBackpack("withdrawn", withdrawnOfferId, earbudsVariantId, 1);
    await addBackpack("money", backpackOfferId, backpackVariantId, 2);
    const cartResponse = await app.request("/v1/cart", { headers: { "x-veyra-cart-id": cartId } });
    const body: unknown = await cartResponse.json();
    const parsed = cartResponseSchema.parse(body);

    const subtotal = parsed.data.totals.itemSubtotal.amountMinor;
    const discount = parsed.data.totals.discountTotal.amountMinor;
    const shipping = parsed.data.totals.shipping.amountMinor;
    const tax = parsed.data.totals.estimatedTax.amountMinor;

    expect(unavailable.status).toBe(409);
    expect(parsed.data.totals.grandTotal.amountMinor).toBe(subtotal - discount + shipping + tax);
    expect(Number.isInteger(parsed.data.totals.grandTotal.amountMinor)).toBe(true);
  });

  it("saves and restores cart lines for later", async () => {
    await addBackpack("save", backpackOfferId, backpackVariantId, 1);
    const lineId = `${backpackOfferId}:${backpackVariantId}`;
    const saved = await app.request(`/v1/cart/items/${encodeURIComponent(lineId)}/save-for-later`, {
      method: "POST",
      headers: mutationHeaders("save-line")
    });
    const restored = await app.request(`/v1/cart/items/${encodeURIComponent(lineId)}/restore`, {
      method: "POST",
      headers: mutationHeaders("restore-line")
    });
    const body: unknown = await restored.json();
    const parsed = cartResponseSchema.parse(body);

    expect(saved.status).toBe(200);
    expect(restored.status).toBe(200);
    expect(parsed.data.items).toHaveLength(1);
    expect(parsed.data.savedForLater).toHaveLength(0);
  });
});

function addBackpack(idempotencyKey: string, offerId: string, variantId: string, quantity: number) {
  return app.request("/v1/cart/items", {
    method: "POST",
    headers: { ...mutationHeaders(idempotencyKey), "content-type": "application/json" },
    body: JSON.stringify({ offerId, variantId, quantity })
  });
}

function mutationHeaders(idempotencyKey: string) {
  return {
    "x-veyra-cart-id": cartId,
    "idempotency-key": idempotencyKey,
    origin: "http://localhost:3000",
    cookie: "veyra_csrf=csrf-token",
    "x-csrf-token": "csrf-token"
  };
}
