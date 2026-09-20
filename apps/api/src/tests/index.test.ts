import { apiErrorResponseSchema, productSeedListResponseSchema } from "@veyra/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import { resetLocalRateLimitsForTests } from "../http.js";
import { app } from "../index.js";

describe("api foundation", () => {
  beforeEach(() => {
    resetLocalRateLimitsForTests();
  });
  it("serves a product seed contract with a request id", async () => {
    const response = await app.request("/v1/products/seed", {
      headers: { "x-request-id": "test-request-id" }
    });
    const body: unknown = await response.json();
    const parsed = productSeedListResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("test-request-id");
    expect(parsed.requestId).toBe("test-request-id");
  });

  it("sets baseline browser security headers", async () => {
    const response = await app.request("/health");

    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("returns a versioned error envelope for missing routes", async () => {
    const response = await app.request("/missing", {
      headers: { "x-request-id": "missing-route" }
    });
    const body: unknown = await response.json();
    const parsed = apiErrorResponseSchema.parse(body);

    expect(response.status).toBe(404);
    expect(parsed.requestId).toBe("missing-route");
    expect(parsed.error.code).toBe("not_found");
  });

  it("rejects oversized requests before handlers run", async () => {
    const response = await app.request("/v1/products/seed", {
      headers: { "content-length": "20000", "x-request-id": "oversized" }
    });
    const body: unknown = await response.json();
    const parsed = apiErrorResponseSchema.parse(body);

    expect(response.status).toBe(413);
    expect(parsed.error.code).toBe("payload_too_large");
  });

  it("applies local fallback rate limits for public reads", async () => {
    let response = await app.request("/health", {
      headers: { "cf-connecting-ip": "203.0.113.10" }
    });

    for (let index = 0; index < 120; index += 1) {
      response = await app.request("/health", {
        headers: { "cf-connecting-ip": "203.0.113.10" }
      });
    }

    const body: unknown = await response.json();
    const parsed = apiErrorResponseSchema.parse(body);

    expect(response.status).toBe(429);
    expect(parsed.error.code).toBe("too_many_requests");
  });
});
