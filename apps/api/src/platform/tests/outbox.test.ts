import { describe, expect, it } from "vitest";

import { InMemoryOutbox } from "../outbox.js";

describe("InMemoryOutbox", () => {
  it("processes pending events through a scheduled drain harness", async () => {
    const outbox = new InMemoryOutbox();
    outbox.publish({
      id: "018f3f7d-7c0c-7ad8-aeb1-8b377c47ac13",
      type: "catalog.product_published",
      aggregateType: "product",
      aggregateId: "product-1",
      correlationId: "request-1",
      payload: { slug: "product-1" }
    });

    const result = await outbox.drain(async () => undefined, 3);

    expect(result.processed).toBe(1);
    expect(result.deadLettered).toBe(0);
    expect(outbox.pending()).toHaveLength(0);
  });

  it("dead-letters after the configured attempt ceiling", async () => {
    const outbox = new InMemoryOutbox();
    outbox.publish({
      id: "018f3f7d-8adf-78ac-930b-90c97c038447",
      type: "catalog.product_published",
      aggregateType: "product",
      aggregateId: "product-1",
      correlationId: "request-1",
      payload: { slug: "product-1" }
    });

    await outbox.drain(async () => {
      throw new Error("consumer failed");
    }, 2);
    const result = await outbox.drain(async () => {
      throw new Error("consumer failed");
    }, 2);

    expect(result.deadLettered).toBe(1);
    expect(outbox.pending()).toHaveLength(0);
  });
});
