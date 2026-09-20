import { describe, expect, it } from "vitest";

import { productSeedListResponseSchema } from "./product.js";

describe("productSeedListResponseSchema", () => {
  it("rejects floating-point money amounts", () => {
    const result = productSeedListResponseSchema.safeParse({
      apiVersion: "v1",
      data: [
        {
          id: "018f3f7d-486c-7d73-9e13-83d8d0c75611",
          slug: "test-product",
          title: "Test Product",
          brand: "Veyra",
          status: "published",
          price: { currency: "USD", amountMinor: 1299.5 },
          availableQuantity: 4
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
