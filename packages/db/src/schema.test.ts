import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { account, outboxEvents, products, session, user, verification } from "./schema.js";

describe("Drizzle U0 schema", () => {
  it("exports tables from the identity, catalog, and platform domain schemas", () => {
    expect(getTableName(user)).toBe("user");
    expect(getTableName(session)).toBe("session");
    expect(getTableName(account)).toBe("account");
    expect(getTableName(verification)).toBe("verification");
    expect(getTableName(products)).toBe("products");
    expect(getTableName(outboxEvents)).toBe("outbox_events");
  });

  it("declares session lifecycle indexes and preserves the ordered outbox work index", () => {
    expect(getTableConfig(session).indexes.map((entry) => entry.config.name)).toEqual([
      "session_user_id_idx",
      "session_expires_at_idx"
    ]);
    expect(getTableConfig(outboxEvents).indexes.map((entry) => entry.config.name)).toEqual([
      "outbox_events_state_created_at_idx"
    ]);
  });

  it("guards product and outbox values that are fixed by the U0 contracts", () => {
    expect(getTableConfig(products).checks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "products_slug_nonblank",
        "products_title_nonblank",
        "products_brand_nonblank",
        "products_status_published",
        "products_currency_inr"
      ])
    );
    expect(getTableConfig(outboxEvents).checks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "outbox_events_type_known",
        "outbox_events_state_known",
        "outbox_events_schema_version_positive"
      ])
    );
  });
});
