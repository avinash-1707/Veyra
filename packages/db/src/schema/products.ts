import { check, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
    categoryId: uuid("category_id"),
    description: text("description"),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    specifications: jsonb("specifications").notNull().default({}),
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
    check("products_available_quantity_nonnegative", sql`${table.availableQuantity} >= 0`),
    check("products_rating_range", sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
    check("products_review_count_nonnegative", sql`${table.reviewCount} >= 0`)
  ]
);
