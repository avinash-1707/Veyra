import {
  deliverySimulationDisclosure,
  type DeliveryEstimate,
  type IndianAddress,
  type ProductDetail,
  type ProductOffer,
  type ProductSummary,
  type ProductVariant,
  type SearchFilters,
  type SearchSort
} from "@veyra/contracts";

import { catalogCategories, catalogProducts, type CatalogProduct } from "./discoveryCatalog.js";

const expeditedPinPrefixes = new Set(["11", "40", "41", "50", "56", "60", "70", "80"]);
const freeStandardShippingThresholdMinor = 49_900;

export type ProductSelection = { variantId?: string; offerId?: string };

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

export function listCategories() {
  return catalogCategories;
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

export function searchProducts(query: string, filters: SearchFilters, sort: SearchSort) {
  const results = catalogProducts
    .filter((product) => matchesQuery(product, query))
    .map((product) => ({ product, result: summary(product, {}) }))
    .filter((entry): entry is { product: CatalogProduct; result: ProductSummary } => entry.result !== undefined)
    .filter(({ product, result }) => matchesFilters(product, result, filters))
    .map(({ result }) => result)
    .sort((left, right) => compareResults(sort, left, right));

  return { query, sort, filters, results, total: results.length };
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
