import {
  deliverySimulationDisclosure,
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

import { paginateByCursor, type CursorPagination } from "../../platform/pagination.js";
import {
  findProductByOffer,
  findProductBySlug,
  findProductsBySlugs,
  findRelatedProducts,
  listCategories as listCatalogCategories,
  listProductSeeds as listCatalogProductSeeds,
  searchCatalog,
  searchSuggestions as searchCatalogSuggestions,
  type CatalogProduct
} from "./repository.js";

const expeditedPinPrefixes = new Set(["11", "40", "41", "50", "56", "60", "70", "80"]);
const freeStandardShippingThresholdMinor = 49_900;
export type ProductSelection = { variantId?: string; offerId?: string };
type SearchProductsResult = {
  query: string;
  sort: SearchSort;
  filters: SearchFilters;
  results: ProductSummary[];
  total: number;
  pageInfo: PageInfo;
};

export function estimateDelivery(address: IndianAddress | undefined, offer: ProductOffer): DeliveryEstimate {
  if (address === undefined) return { status: "address_required", disclosure: deliverySimulationDisclosure };
  if (offer.availability !== "available")
    return {
      status: "unavailable",
      disclosure: deliverySimulationDisclosure,
      reason: "This offer is no longer available. Choose another offer to see delivery estimates."
    };
  const options: Extract<DeliveryEstimate, { status: "available" }>["options"] = [
    {
      speed: "standard",
      shippingPrice: {
        currency: "INR",
        amountMinor: offer.price.amountMinor >= freeStandardShippingThresholdMinor ? 0 : 4_900
      },
      minimumBusinessDays: 3,
      maximumBusinessDays: 6
    }
  ];
  if (offer.expeditedEligible && expeditedPinPrefixes.has(address.pinCode.slice(0, 2)))
    options.push({
      speed: "expedited",
      shippingPrice: { currency: "INR", amountMinor: 14_900 },
      minimumBusinessDays: 1,
      maximumBusinessDays: 3
    });
  return { status: "available", disclosure: deliverySimulationDisclosure, options };
}

export async function listProductSeeds() {
  return listCatalogProductSeeds();
}
export async function listCategories() {
  return listCatalogCategories();
}
export async function getProduct(
  slug: string,
  selection: ProductSelection,
  address?: IndianAddress
): Promise<ProductDetail | undefined> {
  const product = await findProductBySlug(slug);
  if (product === undefined) return undefined;
  const productSummary = summary(product, selection, address);
  return productSummary === undefined
    ? undefined
    : {
        ...productSummary,
        description: product.description,
        specifications: product.specifications,
        variants: product.variants,
        offers: product.offers
      };
}
export async function getProductByOffer(offerId: string): Promise<ProductDetail | undefined> {
  const product = await findProductByOffer(offerId);
  return product === undefined ? undefined : getProduct(product.slug, { offerId });
}
export async function getFactsheetByOffer(offerId: string, variantId?: string): Promise<ProductFactsheet | undefined> {
  const product = await findProductByOffer(offerId);
  return product === undefined
    ? undefined
    : factsheet(product, { offerId, ...(variantId === undefined ? {} : { variantId }) });
}
export async function compareProducts(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))].slice(0, 3);
  const products = (await findProductsBySlugs(uniqueSlugs))
    .map((product) => factsheet(product, {}))
    .filter((product): product is ProductFactsheet => product !== undefined);
  const fieldOrder = [...new Set(products.flatMap((product) => Object.keys(product.specifications)))].sort(
    (left, right) => left.localeCompare(right)
  );
  return { products, fieldOrder };
}
export async function getEvaluation(slug: string) {
  const product = await findProductBySlug(slug);
  if (product === undefined) return undefined;
  const detail = summary(product, {});
  if (detail === undefined) return undefined;
  const relatedProducts = (await findRelatedProducts(product.category.slug, product.slug))
    .map((candidate) => factsheet(candidate, {}))
    .filter((candidate): candidate is ProductFactsheet => candidate !== undefined);
  return {
    product: {
      ...detail,
      description: product.description,
      specifications: product.specifications,
      variants: product.variants,
      offers: product.offers
    },
    reviews: product.reviews,
    questions: product.questions,
    relatedProducts
  };
}
export async function searchProducts(
  query: string,
  filters: SearchFilters,
  sort: SearchSort,
  pagination: CursorPagination = { limit: 20 }
): Promise<SearchProductsResult> {
  const results = (await searchCatalog(query))
    .map((product) => ({ product, result: summary(product, {}) }))
    .filter((entry): entry is { product: CatalogProduct; result: ProductSummary } => entry.result !== undefined)
    .filter(({ product, result }) => matchesFilters(product, result, filters))
    .map(({ result }) => result)
    .sort((left, right) => compareResults(sort, left, right));
  const page = paginateByCursor(results, pagination, (item) => item.slug);
  return { query, sort, filters, results: page.items, total: results.length, pageInfo: page.pageInfo };
}
export async function searchSuggestions(query: string) {
  return query.trim().length === 0 ? [] : searchCatalogSuggestions(query);
}

function selectedOffer(product: CatalogProduct, selection: ProductSelection): ProductOffer | undefined {
  if (selection.offerId !== undefined) {
    const offer = product.offers.find((candidate) => candidate.id === selection.offerId);
    return offer === undefined || (selection.variantId !== undefined && offer.variantId !== selection.variantId)
      ? undefined
      : offer;
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
  const variant = offer === undefined ? undefined : selectedVariant(product, offer);
  return offer === undefined || variant === undefined
    ? undefined
    : {
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
function summary(
  product: CatalogProduct,
  selection: ProductSelection,
  address?: IndianAddress
): ProductSummary | undefined {
  const sheet = factsheet(product, selection);
  return sheet === undefined
    ? undefined
    : { ...sheet, image: product.image, delivery: estimateDelivery(address, sheet.selectedOffer) };
}
function matchesFilters(product: CatalogProduct, result: ProductSummary, filters: SearchFilters): boolean {
  return (
    (filters.category === undefined || product.category.slug === filters.category) &&
    (filters.brand === undefined || product.brand.toLocaleLowerCase() === filters.brand.toLocaleLowerCase()) &&
    (filters.minRating === undefined || product.rating >= filters.minRating) &&
    (filters.minPriceMinor === undefined || result.selectedOffer.price.amountMinor >= filters.minPriceMinor) &&
    (filters.maxPriceMinor === undefined || result.selectedOffer.price.amountMinor <= filters.maxPriceMinor) &&
    (filters.availability !== "available" || result.selectedOffer.availability === "available")
  );
}
function compareResults(sort: SearchSort, left: ProductSummary, right: ProductSummary): number {
  if (sort === "price_asc")
    return (
      left.selectedOffer.price.amountMinor - right.selectedOffer.price.amountMinor ||
      left.slug.localeCompare(right.slug)
    );
  if (sort === "price_desc")
    return (
      right.selectedOffer.price.amountMinor - left.selectedOffer.price.amountMinor ||
      left.slug.localeCompare(right.slug)
    );
  if (sort === "rating_desc") return right.rating - left.rating || left.slug.localeCompare(right.slug);
  return left.slug.localeCompare(right.slug);
}
