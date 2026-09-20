import type { OutboxEvent } from "@veyra/contracts";
import { describe, expect, it } from "vitest";

import { runScheduledOutboxDrain, type ScheduledOutboxStore } from "./scheduledOutbox.js";

function event(id: string): OutboxEvent {
  return {
    id,
    type: "catalog.product_published",
    aggregateType: "product",
    aggregateId: "product-1",
    schemaVersion: 1,
    occurredAt: "2026-09-20T00:00:00.000Z",
    correlationId: "request-1",
    payload: {},
    attemptCount: 0,
    state: "pending"
  };
}

describe("runScheduledOutboxDrain", () => {
  it("reports attempted and processed events", async () => {
    const events = [event("018f3f7d-9c72-79c1-96ba-9fe00c337016")];
    const store: ScheduledOutboxStore = {
      pending: () => events,
      drain: async () => ({ processed: 1, deadLettered: 0 })
    };

    await expect(runScheduledOutboxDrain(store)).resolves.toEqual({
      attempted: 1,
      processed: 1,
      deadLettered: 0
    });
  });
});
