import {
  comparisonGuidanceResponseSchema,
  intelligentSearchResponseSchema,
  reviewGuidanceResponseSchema
} from "@veyra/contracts";
import { describe, expect, it } from "vitest";

import { app } from "../../index.js";
import { intelligentSearch, interpretIntent } from "./intelligence.js";

describe("disabled intelligent shopping", () => {
  it("extracts editable hard constraints and keeps deterministic evidence", async () => {
    const intent = interpretIntent("laptop under ₹1.2 lakh with good battery");
    expect(intent.filters).toEqual({ category: "laptops", maxPriceMinor: 12_000_000 });
    expect(intent.preferences).toEqual(["battery"]);
    const result = await intelligentSearch("laptop under ₹1.2 lakh with good battery");
    expect(result.provider).toEqual({ status: "disabled", fallback: "deterministic-baseline" });
    expect(
      result.results.every(
        (entry) => entry.evidence.length > 0 && entry.product.selectedOffer.price.amountMinor <= 12_000_000
      )
    ).toBe(true);
  });

  it("grounds comparison and review guidance in supplied facts and raw reviews", async () => {
    const comparison = await app.request(
      "/v1/ai/comparison?products=veyra-everyday-backpack,veyra-noise-isolating-earbuds"
    );
    const comparisonBody: unknown = await comparison.json();
    const parsedComparison = comparisonGuidanceResponseSchema.parse(comparisonBody).data;
    const reviews = await app.request("/v1/ai/products/veyra-everyday-backpack/reviews");
    const reviewsBody: unknown = await reviews.json();
    const parsedReviews = reviewGuidanceResponseSchema.parse(reviewsBody).data;
    expect(parsedComparison.summary).toContain("Veyra Everyday Backpack");
    expect(parsedComparison.evidence).toHaveLength(4);
    expect(parsedReviews.reviewCount).toBe(1);
    expect(parsedReviews.evidence[0]?.type).toBe("review");
  });

  it("returns a schema-valid provider-disabled fallback without changing conventional search", async () => {
    const response = await app.request("/v1/ai/search?q=laptop%20under%20%E2%82%B91.2%20lakh");
    const body: unknown = await response.json();
    const parsed = intelligentSearchResponseSchema.parse(body);
    expect(response.status).toBe(200);
    expect(parsed.data.provider.status).toBe("disabled");
    expect(
      parsed.data.results.every((entry) =>
        entry.evidence.every(
          (evidence) => evidence.id === entry.product.id || evidence.id === entry.product.selectedOffer.id
        )
      )
    ).toBe(true);
  });
});
