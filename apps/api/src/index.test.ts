import { productSeedListResponseSchema } from "@veyra/contracts";
import { describe, expect, it } from "vitest";

import { app } from "./index.js";

describe("api foundation", () => {
  it("serves a product seed contract", async () => {
    const response = await app.request("/v1/products/seed");
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(productSeedListResponseSchema.safeParse(body).success).toBe(true);
  });
});
