import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { outboxEvents, products, sessions, users } from "./schema.js";

describe("Drizzle U0 schema", () => {
  it("declares identity, product, and outbox tables", () => {
    expect(getTableName(users)).toBe("users");
    expect(getTableName(sessions)).toBe("sessions");
    expect(getTableName(products)).toBe("products");
    expect(getTableName(outboxEvents)).toBe("outbox_events");
  });
});
