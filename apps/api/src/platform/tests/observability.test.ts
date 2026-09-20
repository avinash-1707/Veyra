import { describe, expect, it } from "vitest";

import { createAuditEvent, redactLogFields } from "../observability.js";

describe("observability", () => {
  it("redacts nested sensitive log fields", () => {
    expect(
      redactLogFields({
        requestId: "request-1",
        password: "secret",
        nested: { authorization: "bearer token", safe: "value" }
      })
    ).toEqual({
      requestId: "request-1",
      password: "[REDACTED]",
      nested: { authorization: "[REDACTED]", safe: "value" }
    });
  });

  it("creates audit events with redacted metadata", () => {
    const event = createAuditEvent({
      actorId: "operator-1",
      action: "outbox.replay",
      targetType: "outbox_event",
      targetId: "event-1",
      correlationId: "request-1",
      metadata: { token: "secret-token" }
    });

    expect(event.metadata.token).toBe("[REDACTED]");
    expect(event.occurredAt).toEqual(expect.any(String));
  });
});
