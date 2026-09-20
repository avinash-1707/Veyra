import type { Category, ProductOffer, ProductQuestion, ProductReview, ProductVariant } from "@veyra/contracts";

import { getSqlClient } from "../../platform/database.js";

const sql = getSqlClient();

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: Category;
  rating: number;
  reviewCount: number;
  image: { alt: string; url: string };
  description: string;
  specifications: Record<string, string>;
  variants: ProductVariant[];
  offers: ProductOffer[];
  reviews: ProductReview[];
  questions: ProductQuestion[];
};

export async function listProductSeeds() {
  const sql = requireSqlClient();
  const rows =
    await sql`SELECT id, slug, title, brand, status, currency, amount_minor, available_quantity FROM products WHERE status = 'published' ORDER BY slug`;
  return rows.flatMap((row) =>
    isRecordObject(row) &&
    typeof row.id === "string" &&
    typeof row.slug === "string" &&
    typeof row.title === "string" &&
    typeof row.brand === "string" &&
    typeof row.status === "string" &&
    typeof row.currency === "string"
      ? [
          {
            id: row.id,
            slug: row.slug,
            title: row.title,
            brand: row.brand,
            status: row.status,
            price: { currency: row.currency, amountMinor: Number(row.amount_minor) },
            availableQuantity: Number(row.available_quantity)
          }
        ]
      : []
  );
}

export async function listCategories(): Promise<Category[]> {
  const sql = requireSqlClient();
  const rows = await sql`SELECT slug, name FROM categories ORDER BY name`;
  return rows.map(categoryFromRow).filter((category): category is Category => category !== undefined);
}

export async function findProductBySlug(slug: string): Promise<CatalogProduct | undefined> {
  const sql = requireSqlClient();
  const products = await sql`
    SELECT p.id, p.slug, p.title, p.brand, p.rating, p.review_count, p.image_url, p.image_alt,
      p.description, p.specifications, c.slug AS category_slug, c.name AS category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ${slug} AND p.status = 'published'`;
  const product = productFromRow(products[0]);
  if (product === undefined) return undefined;
  return hydrateProduct(product);
}

export async function findProductByOffer(offerId: string): Promise<CatalogProduct | undefined> {
  const sql = requireSqlClient();
  const rows = await sql`
    SELECT p.slug FROM products p
    JOIN offers o ON o.product_id = p.id
    WHERE o.id = ${offerId} AND p.status = 'published'`;
  const row = rows[0];
  return isRecordObject(row) && typeof row.slug === "string" ? findProductBySlug(row.slug) : undefined;
}

export async function findProductsBySlugs(slugs: string[]): Promise<CatalogProduct[]> {
  const products = await Promise.all(slugs.map(findProductBySlug));
  return products.filter((product): product is CatalogProduct => product !== undefined);
}

export async function findRelatedProducts(categorySlug: string, excludedSlug: string): Promise<CatalogProduct[]> {
  const sql = requireSqlClient();
  const rows = await sql`
    SELECT p.slug FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE c.slug = ${categorySlug} AND p.slug <> ${excludedSlug} AND p.status = 'published'
    ORDER BY p.slug
    LIMIT 4`;
  return findProductsBySlugs(
    rows.flatMap((row) => (isRecordObject(row) && typeof row.slug === "string" ? [row.slug] : []))
  );
}

export async function searchCatalog(query: string): Promise<CatalogProduct[]> {
  const sql = requireSqlClient();
  const normalizedQuery = query.trim();
  const rows = await sql`
    SELECT p.slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published'
      AND (
        ${normalizedQuery} = ''
        OR to_tsvector('simple', concat_ws(' ', p.title, p.brand, c.name, coalesce(p.description, ''), p.specifications::text))
          @@ plainto_tsquery('simple', ${normalizedQuery})
      )
    ORDER BY p.slug`;
  return findProductsBySlugs(
    rows.flatMap((row) => (isRecordObject(row) && typeof row.slug === "string" ? [row.slug] : []))
  );
}

export async function searchSuggestions(query: string): Promise<Array<{ type: "category" | "query"; value: string }>> {
  const sql = requireSqlClient();
  const normalizedQuery = `%${query.trim()}%`;
  const rows = await sql`
    SELECT 'category' AS type, name AS value FROM categories WHERE name ILIKE ${normalizedQuery}
    UNION ALL
    SELECT 'query' AS type, title AS value FROM products WHERE status = 'published' AND title ILIKE ${normalizedQuery}
    LIMIT 8`;
  return rows.flatMap((row) =>
    isRecordObject(row) && (row.type === "category" || row.type === "query") && typeof row.value === "string"
      ? [{ type: row.type, value: row.value }]
      : []
  );
}

async function hydrateProduct(
  product: Omit<CatalogProduct, "variants" | "offers" | "reviews" | "questions">
): Promise<CatalogProduct> {
  const sql = requireSqlClient();
  const [variantRows, offerRows, reviewRows, questionRows] = await Promise.all([
    sql`SELECT id, name, attributes FROM product_variants WHERE product_id = ${product.id} ORDER BY id`,
    sql`SELECT o.id, o.variant_id, o.amount_minor, o.condition, o.availability, o.expedited_eligible, s.name AS seller_name FROM offers o JOIN sellers s ON s.id = o.seller_id WHERE o.product_id = ${product.id} ORDER BY o.amount_minor, o.id`,
    sql`SELECT id, product_id, rating, title, body, author_display_name, verified_purchase, created_at FROM reviews WHERE product_id = ${product.id} AND moderation_status = 'published' ORDER BY created_at DESC`,
    sql`SELECT id, product_id, question, answer, created_at FROM questions WHERE product_id = ${product.id} AND moderation_status = 'published' ORDER BY created_at DESC`
  ]);
  return {
    ...product,
    variants: variantRows.map(variantFromRow).filter((variant): variant is ProductVariant => variant !== undefined),
    offers: offerRows.map(offerFromRow).filter((offer): offer is ProductOffer => offer !== undefined),
    reviews: reviewRows.map(reviewFromRow).filter((review): review is ProductReview => review !== undefined),
    questions: questionRows
      .map(questionFromRow)
      .filter((question): question is ProductQuestion => question !== undefined)
  };
}

function requireSqlClient() {
  if (sql === undefined) throw new Error("Catalog reads require DATABASE_URL or DATABASE_URL_POOLED.");
  return sql;
}

function productFromRow(
  row: unknown
): Omit<CatalogProduct, "variants" | "offers" | "reviews" | "questions"> | undefined {
  if (
    !isRecordObject(row) ||
    typeof row.id !== "string" ||
    typeof row.slug !== "string" ||
    typeof row.title !== "string" ||
    typeof row.brand !== "string" ||
    typeof row.category_slug !== "string" ||
    typeof row.category_name !== "string"
  )
    return undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    category: { slug: row.category_slug, name: row.category_name },
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    image: {
      alt: typeof row.image_alt === "string" ? row.image_alt : row.title,
      url: typeof row.image_url === "string" ? row.image_url : "/catalog/placeholder.webp"
    },
    description: typeof row.description === "string" ? row.description : "",
    specifications: stringRecord(row.specifications)
  };
}
function categoryFromRow(row: unknown): Category | undefined {
  return isRecordObject(row) && typeof row.slug === "string" && typeof row.name === "string"
    ? { slug: row.slug, name: row.name }
    : undefined;
}
function variantFromRow(row: unknown): ProductVariant | undefined {
  return isRecordObject(row) && typeof row.id === "string" && typeof row.name === "string"
    ? { id: row.id, name: row.name, attributes: stringRecord(row.attributes) }
    : undefined;
}
function offerFromRow(row: unknown): ProductOffer | undefined {
  if (
    !isRecordObject(row) ||
    typeof row.id !== "string" ||
    typeof row.variant_id !== "string" ||
    typeof row.seller_name !== "string" ||
    typeof row.condition !== "string" ||
    typeof row.availability !== "string"
  )
    return undefined;
  if (
    (row.condition !== "new" && row.condition !== "open_box") ||
    !["available", "unavailable", "withdrawn"].includes(row.availability)
  )
    return undefined;
  return {
    id: row.id,
    variantId: row.variant_id,
    sellerName: row.seller_name,
    price: { currency: "INR", amountMinor: Number(row.amount_minor) },
    condition: row.condition,
    availability: row.availability as ProductOffer["availability"],
    expeditedEligible: row.expedited_eligible === true
  };
}
function reviewFromRow(row: unknown): ProductReview | undefined {
  return isRecordObject(row) &&
    typeof row.id === "string" &&
    typeof row.product_id === "string" &&
    typeof row.title === "string" &&
    typeof row.body === "string" &&
    typeof row.author_display_name === "string"
    ? {
        id: row.id,
        productId: row.product_id,
        rating: Number(row.rating),
        title: row.title,
        body: row.body,
        authorDisplayName: row.author_display_name,
        verifiedPurchase: row.verified_purchase === true,
        createdAt: dateString(row.created_at)
      }
    : undefined;
}
function questionFromRow(row: unknown): ProductQuestion | undefined {
  return isRecordObject(row) &&
    typeof row.id === "string" &&
    typeof row.product_id === "string" &&
    typeof row.question === "string" &&
    (typeof row.answer === "string" || row.answer === null)
    ? {
        id: row.id,
        productId: row.product_id,
        question: row.question,
        answer: row.answer,
        createdAt: dateString(row.created_at)
      }
    : undefined;
}
function stringRecord(value: unknown): Record<string, string> {
  return isRecordObject(value)
    ? Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      )
    : {};
}
function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function dateString(value: unknown): string {
  return value instanceof Date
    ? value.toISOString()
    : typeof value === "string"
      ? new Date(value).toISOString()
      : new Date().toISOString();
}
