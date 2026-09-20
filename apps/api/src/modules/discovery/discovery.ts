import {
  deliverySimulationDisclosure,
  type Category,
  type DeliveryEstimate,
  type IndianAddress,
  type PageInfo,
  type ProductDetail,
  type ProductFactsheet,
  type ProductOffer,
  type ProductSummary,
  type ProductVariant,
  type SearchFilters,
  type SearchSort
} from "@veyra/contracts";

import { getSqlClient } from "../../platform/database.js";
import { paginateByCursor, type CursorPagination } from "../../platform/pagination.js";
import { catalogCategories, catalogProducts, type CatalogProduct } from "../catalog/catalogFixture.js";

const expeditedPinPrefixes = new Set(["11", "40", "41", "50", "56", "60", "70", "80"]);
const freeStandardShippingThresholdMinor = 49_900;

export type ProductSelection = { variantId?: string; offerId?: string };
type SearchProductsResult = { query: string; sort: SearchSort; filters: SearchFilters; results: ProductSummary[]; total: number; pageInfo: PageInfo };

export function estimateDelivery(address: IndianAddress | undefined, offer: ProductOffer): DeliveryEstimate {
  if (address === undefined) {
    return { status: "address_required", disclosure: deliverySimulationDisclosure };
  }

  if (offer.availability !== "available") {
    return {
      status: "unavailable",
      disclosure: deliverySimulationDisclosure,
      reason: "This offer is no longer available. Choose another offer to see delivery estimates."
    };
  }

  const standardShippingMinor = offer.price.amountMinor >= freeStandardShippingThresholdMinor ? 0 : 4_900;
  const options: Array<{
    speed: "standard" | "expedited";
    shippingPrice: { currency: "INR"; amountMinor: number };
    minimumBusinessDays: number;
    maximumBusinessDays: number;
  }> = [{
    speed: "standard",
    shippingPrice: { currency: "INR", amountMinor: standardShippingMinor },
    minimumBusinessDays: 3,
    maximumBusinessDays: 6
  }];

  if (offer.expeditedEligible && expeditedPinPrefixes.has(address.pinCode.slice(0, 2))) {
    options.push({
      speed: "expedited" as const,
      shippingPrice: { currency: "INR" as const, amountMinor: 14_900 },
      minimumBusinessDays: 1,
      maximumBusinessDays: 3
    });
  }

  return { status: "available", disclosure: deliverySimulationDisclosure, options };
}

function selectedOffer(product: CatalogProduct, selection: ProductSelection): ProductOffer | undefined {
  if (selection.offerId !== undefined) {
    const offer = product.offers.find((candidate) => candidate.id === selection.offerId);
    if (offer === undefined || (selection.variantId !== undefined && offer.variantId !== selection.variantId)) {
      return undefined;
    }
    return offer;
  }

  const offers = product.offers
    .filter((offer) => selection.variantId === undefined || offer.variantId === selection.variantId)
    .sort((left, right) => left.price.amountMinor - right.price.amountMinor || left.id.localeCompare(right.id));

  return offers.find((offer) => offer.availability === "available") ?? offers[0];
}

function selectedVariant(product: CatalogProduct, offer: ProductOffer): ProductVariant | undefined {
  return product.variants.find((variant) => variant.id === offer.variantId);
}

function factsheet(product: CatalogProduct, selection: ProductSelection): ProductFactsheet | undefined {
  const offer = selectedOffer(product, selection);
  if (offer === undefined) return undefined;
  const variant = selectedVariant(product, offer);
  if (variant === undefined) return undefined;

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    category: product.category,
    rating: product.rating,
    reviewCount: product.reviewCount,
    selectedVariant: variant,
    selectedOffer: offer,
    specifications: product.specifications
  };
}

function summary(product: CatalogProduct, selection: ProductSelection, address?: IndianAddress): ProductSummary | undefined {
  const offer = selectedOffer(product, selection);
  if (offer === undefined) {
    return undefined;
  }
  const variant = selectedVariant(product, offer);
  if (variant === undefined) {
    return undefined;
  }

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    category: product.category,
    rating: product.rating,
    reviewCount: product.reviewCount,
    image: product.image,
    selectedVariant: variant,
    selectedOffer: offer,
    delivery: estimateDelivery(address, offer)
  };
}

export async function listCategories() {
  const sql = getSqlClient();
  if (sql === undefined) return catalogCategories;
  const rows = await sql`SELECT slug, name FROM categories ORDER BY name`;
  return rows.map(categoryFromRow).filter((category): category is typeof catalogCategories[number] => category !== undefined);
}

export function getProduct(slug: string, selection: ProductSelection, address?: IndianAddress): ProductDetail | undefined {
  const product = catalogProducts.find((candidate) => candidate.slug === slug);
  if (product === undefined) {
    return undefined;
  }
  const productSummary = summary(product, selection, address);
  if (productSummary === undefined) {
    return undefined;
  }

  return {
    ...productSummary,
    description: product.description,
    specifications: product.specifications,
    variants: product.variants,
    offers: product.offers
  };
}

function matchesQuery(product: CatalogProduct, query: string): boolean {
  if (query.length === 0) {
    return true;
  }
  const haystack = [product.title, product.brand, product.category.name, product.description, ...Object.values(product.specifications)]
    .join(" ")
    .toLocaleLowerCase();
  return query.toLocaleLowerCase().split(/\s+/).every((term) => haystack.includes(term));
}

function matchesFilters(product: CatalogProduct, result: ProductSummary, filters: SearchFilters): boolean {
  if (filters.category !== undefined && product.category.slug !== filters.category) return false;
  if (filters.brand !== undefined && product.brand.toLocaleLowerCase() !== filters.brand.toLocaleLowerCase()) return false;
  if (filters.minRating !== undefined && product.rating < filters.minRating) return false;
  if (filters.minPriceMinor !== undefined && result.selectedOffer.price.amountMinor < filters.minPriceMinor) return false;
  if (filters.maxPriceMinor !== undefined && result.selectedOffer.price.amountMinor > filters.maxPriceMinor) return false;
  if (filters.availability === "available" && result.selectedOffer.availability !== "available") return false;
  return true;
}

function compareResults(sort: SearchSort, left: ProductSummary, right: ProductSummary): number {
  if (sort === "price_asc") return left.selectedOffer.price.amountMinor - right.selectedOffer.price.amountMinor || left.slug.localeCompare(right.slug);
  if (sort === "price_desc") return right.selectedOffer.price.amountMinor - left.selectedOffer.price.amountMinor || left.slug.localeCompare(right.slug);
  if (sort === "rating_desc") return right.rating - left.rating || left.slug.localeCompare(right.slug);
  return left.slug.localeCompare(right.slug);
}

export function getProductByOffer(offerId: string): ProductDetail | undefined {
  const product = catalogProducts.find((candidate) => candidate.offers.some((offer) => offer.id === offerId));
  return product === undefined ? undefined : getProduct(product.slug, { offerId });
}

export function getFactsheetByOffer(offerId: string, variantId?: string): ProductFactsheet | undefined {
  const product = catalogProducts.find((candidate) => candidate.offers.some((offer) => offer.id === offerId));
  return product === undefined ? undefined : factsheet(product, { offerId, ...(variantId === undefined ? {} : { variantId }) });
}

export function compareProducts(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.trim()).filter((slug) => slug.length > 0))].slice(0, 3);
  const products = uniqueSlugs
    .map((slug) => catalogProducts.find((candidate) => candidate.slug === slug))
    .filter((product): product is CatalogProduct => product !== undefined)
    .map((product) => factsheet(product, {}))
    .filter((product): product is ProductFactsheet => product !== undefined);
  const fieldOrder = [...new Set(products.flatMap((product) => Object.keys(product.specifications)))].sort((left, right) => left.localeCompare(right));
  return { products, fieldOrder };
}

export function getEvaluation(slug: string) {
  const product = catalogProducts.find((candidate) => candidate.slug === slug);
  const detail = getProduct(slug, {});
  if (product === undefined || detail === undefined) return undefined;
  const relatedProducts = catalogProducts
    .filter((candidate) => candidate.category.slug === product.category.slug && candidate.slug !== product.slug)
    .map((candidate) => factsheet(candidate, {}))
    .filter((candidate): candidate is ProductFactsheet => candidate !== undefined)
    .slice(0, 4);
  return { product: detail, reviews: product.reviews, questions: product.questions, relatedProducts };
}

export async function searchProducts(query: string, filters: SearchFilters, sort: SearchSort, pagination: CursorPagination = { limit: 20 }): Promise<SearchProductsResult> {
  const sql = getSqlClient();
  if (sql !== undefined) return searchProductsFromDatabase(query, filters, sort, pagination);
  const results = catalogProducts
    .filter((product) => matchesQuery(product, query))
    .map((product) => ({ product, result: summary(product, {}) }))
    .filter((entry): entry is { product: CatalogProduct; result: ProductSummary } => entry.result !== undefined)
    .filter(({ product, result }) => matchesFilters(product, result, filters))
    .map(({ result }) => result)
    .sort((left, right) => compareResults(sort, left, right));

  const page = paginateByCursor(results, pagination, (item) => item.slug);
  return { query, sort, filters, results: page.items, total: results.length, pageInfo: page.pageInfo };
}

async function searchProductsFromDatabase(query: string, filters: SearchFilters, sort: SearchSort, pagination: CursorPagination): Promise<SearchProductsResult> {
  const sql = getSqlClient();
  if (sql === undefined) return searchProducts(query, filters, sort, pagination);
  const rows = await sql`
    SELECT p.id, p.slug, p.title, p.brand, p.rating, p.review_count, p.image_url, p.image_alt,
      c.slug AS category_slug, c.name AS category_name,
      v.id AS variant_id, v.name AS variant_name, v.attributes,
      o.id AS offer_id, o.amount_minor, o.condition, o.availability, o.expedited_eligible,
      s.name AS seller_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN LATERAL (
      SELECT * FROM offers candidate
      WHERE candidate.product_id = p.id
      ORDER BY CASE WHEN candidate.availability = 'available' THEN 0 ELSE 1 END, candidate.amount_minor ASC, candidate.id ASC
      LIMIT 1
    ) o ON true
    JOIN product_variants v ON v.id = o.variant_id
    JOIN sellers s ON s.id = o.seller_id
    WHERE p.status = 'published'
    ORDER BY p.slug ASC`;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = rows
    .map(summaryFromRow)
    .filter((result): result is ProductSummary => result !== undefined)
    .filter((result) => normalizedQuery.length === 0 || [result.title, result.brand, result.category.name].join(" ").toLocaleLowerCase().split(/\s+/).join(" ").includes(normalizedQuery) || normalizedQuery.split(/\s+/).every((term) => [result.title, result.brand, result.category.name].join(" ").toLocaleLowerCase().includes(term)))
    .filter((result) => dbMatchesFilters(result, filters))
    .sort((left, right) => compareResults(sort, left, right));
  const page = paginateByCursor(results, pagination, (item) => item.slug);
  return { query, sort, filters, results: page.items, total: results.length, pageInfo: page.pageInfo };
}

function dbMatchesFilters(result: ProductSummary, filters: SearchFilters): boolean {
  if (filters.category !== undefined && result.category.slug !== filters.category) return false;
  if (filters.brand !== undefined && result.brand.toLocaleLowerCase() !== filters.brand.toLocaleLowerCase()) return false;
  if (filters.minRating !== undefined && result.rating < filters.minRating) return false;
  if (filters.minPriceMinor !== undefined && result.selectedOffer.price.amountMinor < filters.minPriceMinor) return false;
  if (filters.maxPriceMinor !== undefined && result.selectedOffer.price.amountMinor > filters.maxPriceMinor) return false;
  if (filters.availability === "available" && result.selectedOffer.availability !== "available") return false;
  return true;
}

function categoryFromRow(row: unknown): Category | undefined {
  if (!isRecordObject(row) || typeof row.slug !== "string" || typeof row.name !== "string") return undefined;
  return { slug: row.slug, name: row.name };
}

function summaryFromRow(row: unknown): ProductSummary | undefined {
  if (!isRecordObject(row) || typeof row.id !== "string" || typeof row.slug !== "string" || typeof row.title !== "string" || typeof row.brand !== "string" || typeof row.category_slug !== "string" || typeof row.category_name !== "string" || typeof row.variant_id !== "string" || typeof row.variant_name !== "string" || typeof row.offer_id !== "string" || typeof row.seller_name !== "string" || typeof row.condition !== "string" || typeof row.availability !== "string") return undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    category: { slug: row.category_slug, name: row.category_name },
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    image: { alt: typeof row.image_alt === "string" ? row.image_alt : row.title, url: typeof row.image_url === "string" ? row.image_url : "/catalog/placeholder.webp" },
    selectedVariant: { id: row.variant_id, name: row.variant_name, attributes: attributesFromUnknown(row.attributes) },
    selectedOffer: { id: row.offer_id, variantId: row.variant_id, sellerName: row.seller_name, price: { currency: "INR", amountMinor: Number(row.amount_minor) }, condition: row.condition as ProductOffer["condition"], availability: row.availability as ProductOffer["availability"], expeditedEligible: row.expedited_eligible === true },
    delivery: { status: "address_required", disclosure: deliverySimulationDisclosure }
  };
}

function attributesFromUnknown(value: unknown): Record<string, string> {
  if (!isRecordObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function searchSuggestions(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length === 0) return [];

  const categorySuggestions = catalogCategories
    .filter((category) => category.name.toLocaleLowerCase().includes(normalizedQuery))
    .map((category) => ({ type: "category" as const, value: category.name }));
  const titleSuggestions = catalogProducts
    .filter((product) => product.title.toLocaleLowerCase().includes(normalizedQuery))
    .map((product) => ({ type: "query" as const, value: product.title }));

  return [...categorySuggestions, ...titleSuggestions].slice(0, 8);
}
