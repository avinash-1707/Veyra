import {
  deliveryEstimateResponseSchema,
  productDetailResponseSchema,
  searchListResponseSchema,
  suggestionsResponseSchema
} from "@veyra/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { resetLocalRateLimitsForTests } from "../../../platform/http.js";
import { app } from "../../../index.js";

const backpackOfferId = "018f3f7d-486c-7d73-9e13-83d8d0c75614";
const withdrawnEarbudsOfferId = "018f3f7d-5b68-7aef-9e10-2d890fc8a615";

const deliveryAddress = {
  recipientName: "Aarav Sharma",
  line1: "12 Example Road",
  city: "Bengaluru",
  state: "Karnataka",
  pinCode: "560001"
};

describe("baseline discovery API", () => {
  beforeEach(() => {
    resetLocalRateLimitsForTests();
  });

  it("returns conventional lexical results with URL filters and sort", async () => {
    const response = await app.request("/v1/search?q=veyra&category=bags&availability=available&sort=price_asc");
    const body: unknown = await response.json();
    const parsed = searchListResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data.total).toBe(1);
    expect(parsed.data.results[0]?.slug).toBe("veyra-everyday-backpack");
    expect(parsed.data.filters).toEqual({ category: "bags", availability: "available" });
  });

  it("returns an editable empty conventional result rather than an error", async () => {
    const response = await app.request("/v1/search?q=does-not-exist");
    const body: unknown = await response.json();
    const parsed = searchListResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data.query).toBe("does-not-exist");
    expect(parsed.data.results).toEqual([]);
  });

  it("returns typed query suggestions without invoking AI", async () => {
    const response = await app.request("/v1/search/suggestions?q=back");
    const body: unknown = await response.json();
    const parsed = suggestionsResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data).toContainEqual({ type: "query", value: "Veyra Everyday Backpack" });
  });

  it("shows the default selected offer and address-required delivery state", async () => {
    const response = await app.request("/v1/products/veyra-everyday-backpack");
    const body: unknown = await response.json();
    const parsed = productDetailResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data.selectedOffer.id).toBe(backpackOfferId);
    expect(parsed.data.delivery.status).toBe("address_required");
  });

  it("keeps withdrawn offers visible but prevents a delivery promise", async () => {
    const response = await app.request(`/v1/products/veyra-noise-isolating-earbuds?offer=${withdrawnEarbudsOfferId}`);
    const body: unknown = await response.json();
    const parsed = productDetailResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data.selectedOffer.availability).toBe("withdrawn");
    expect(parsed.data.delivery.status).toBe("address_required");
  });

  it("calculates simulated delivery from a full Indian address without storing it", async () => {
    const response = await app.request(`/v1/delivery/estimate?offer=${backpackOfferId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(deliveryAddress)
    });
    const body: unknown = await response.json();
    const parsed = deliveryEstimateResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.data.status).toBe("available");
    if (parsed.data.status === "available") {
      expect(parsed.data.options.map((option) => option.speed)).toEqual(["standard", "expedited"]);
      expect(parsed.data.options[0]?.shippingPrice.amountMinor).toBe(0);
    }
  });

  it("rejects malformed filters and incomplete Indian addresses", async () => {
    const invalidSearch = await app.request("/v1/search?minPriceMinor=not-a-number");
    const invalidDelivery = await app.request(`/v1/delivery/estimate?offer=${backpackOfferId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...deliveryAddress, pinCode: "5600" })
    });

    expect(invalidSearch.status).toBe(400);
    expect(invalidDelivery.status).toBe(400);
  });
});
