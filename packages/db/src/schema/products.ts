import { check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    brand: text("brand").notNull(),
    status: text("status").notNull(),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    availableQuantity: integer("available_quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("products_slug_nonblank", sql`btrim(${table.slug}) <> ''`),
    check("products_title_nonblank", sql`btrim(${table.title}) <> ''`),
    check("products_brand_nonblank", sql`btrim(${table.brand}) <> ''`),
    check("products_status_published", sql`${table.status} = 'published'`),
    check("products_currency_inr", sql`${table.currency} = 'INR'`),
    check("products_amount_minor_nonnegative", sql`${table.amountMinor} >= 0`),
    check("products_available_quantity_nonnegative", sql`${table.availableQuantity} >= 0`)
  ]
);
