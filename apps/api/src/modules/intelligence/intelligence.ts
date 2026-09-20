import type { ComparisonGuidance, IntelligentSearch, Intent, ProductSummary, ReviewGuidance, SearchFilters } from "@veyra/contracts";

import { compareProducts, getEvaluation, searchProducts } from "../discovery/discovery.js";

const categoryTerms: Readonly<Record<string, string>> = { laptop: "laptops", backpack: "bags", bag: "bags" };
const attributeTerms = ["battery", "thermal", "lightweight", "waterproof"] as const;

// Versioned local prompt-equivalent policy; provider calls stay disabled until D-11 enablement evidence exists.
export const intelligenceConfiguration = {
  schemaVersion: 1,
  providerEnabled: false,
  allowedModels: ["google/gemini-2.5-flash-lite", "openai/gpt-4.1-mini"],
  requestTimeoutMs: 5_000,
  retryCount: 0,
  circuitBreaker: { failures: 3, openMs: 30_000 }
} as const;

export function interpretIntent(query: string): Intent {
  const normalized = query.trim().toLocaleLowerCase();
  const filters: SearchFilters = {};
  const category = Object.entries(categoryTerms).find(([term]) => normalized.includes(term))?.[1];
  if (category !== undefined) filters.category = category;
  const budget = normalized.match(/(?:under|below|less than)\s*₹?\s*([\d,.]+)(?:\s*(lakh|lac))?/i);
  if (budget?.[1] !== undefined) {
    const amount = Number(budget[1].replace(/,/g, "")) * (budget[2] === undefined ? 100 : 100_000 * 100);
    if (Number.isSafeInteger(amount) && amount >= 0) filters.maxPriceMinor = amount;
  }
  const mentioned = attributeTerms.filter((term) => normalized.includes(term));
  return { schemaVersion: 1, originalQuery: query, filters, requiredAttributes: [], preferences: mentioned, uncertainty: mentioned.length === 0 ? ["No structured preferences were recognized; edit the conventional filters if needed."] : [], source: "deterministic_fallback" };
}

export function intelligentSearch(query: string): IntelligentSearch {
  const intent = interpretIntent(query);
  const search = searchProducts(query, intent.filters, "relevance");
  return { schemaVersion: 1, provider: { status: "disabled", fallback: "deterministic-baseline" }, intent, results: search.results.map(rankProduct), total: search.total };
}

export function comparisonGuidance(slugs: string[]): ComparisonGuidance | undefined {
  const comparison = compareProducts(slugs);
  if (comparison.products.length === 0) return undefined;
  const prices = comparison.products.map((product) => product.selectedOffer.price.amountMinor);
  const lowest = Math.min(...prices);
  const title = comparison.products.find((product) => product.selectedOffer.price.amountMinor === lowest)?.title;
  const missingFields = comparison.fieldOrder.filter((field) => comparison.products.some((product) => product.specifications[field] === null));
  return { schemaVersion: 1, provider: { status: "disabled", fallback: "deterministic-baseline" }, products: comparison.products, summary: `${title} has the lowest currently selected offer in this comparison. Inspect the normalized facts table before choosing.`, uncertainties: missingFields.length === 0 ? [] : [`Unavailable comparison facts: ${missingFields.join(", ")}.`], evidence: comparison.products.flatMap((product) => [{ id: product.id, type: "product" as const, field: "specifications" }, { id: product.selectedOffer.id, type: "offer" as const, field: "price" }]) };
}

export function reviewGuidance(slug: string): ReviewGuidance | undefined {
  const evaluation = getEvaluation(slug);
  if (evaluation === undefined) return undefined;
  const reviewCount = evaluation.reviews.length;
  return { schemaVersion: 1, provider: { status: "disabled", fallback: "deterministic-baseline" }, productId: evaluation.product.id, reviewCount, summary: reviewCount === 0 ? "No raw review evidence is available in this fixture." : `${reviewCount} raw review${reviewCount === 1 ? " is" : "s are"} available; read the original reviews before deciding.`, uncertainties: reviewCount === 0 ? ["No review themes are inferred without raw review evidence."] : ["This deterministic summary does not infer sentiment themes."], evidence: evaluation.reviews.map((review) => ({ id: review.id, type: "review" as const, field: "review" })) };
}

function rankProduct(product: ProductSummary) {
  const reasons = [
    `Matches the ${product.category.name} category.`,
    `${product.selectedOffer.sellerName} offers it for ₹${(product.selectedOffer.price.amountMinor / 100).toLocaleString("en-IN")}.`
  ];
  const tradeoff = product.delivery.status === "address_required" ? "Add an address to compare simulated delivery options." : product.reviewCount === 0 ? "No review history is available in this fixture." : `Based on ${product.reviewCount} visible reviews; inspect the raw reviews before deciding.`;
  return { product, reasons, tradeoff, evidence: [{ id: product.id, type: "product" as const, field: "category" }, { id: product.selectedOffer.id, type: "offer" as const, field: "price" }] };
}
