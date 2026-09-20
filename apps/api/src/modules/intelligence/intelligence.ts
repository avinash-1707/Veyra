import type { IntelligentSearch, Intent, ProductSummary, SearchFilters } from "@veyra/contracts";

import { searchProducts } from "../discovery/discovery.js";

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

function rankProduct(product: ProductSummary) {
  const reasons = [
    `Matches the ${product.category.name} category.`,
    `${product.selectedOffer.sellerName} offers it for ₹${(product.selectedOffer.price.amountMinor / 100).toLocaleString("en-IN")}.`
  ];
  const tradeoff = product.delivery.status === "address_required" ? "Add an address to compare simulated delivery options." : product.reviewCount === 0 ? "No review history is available in this fixture." : `Based on ${product.reviewCount} visible reviews; inspect the raw reviews before deciding.`;
  return { product, reasons, tradeoff, evidence: [{ id: product.id, type: "product" as const, field: "category" }, { id: product.selectedOffer.id, type: "offer" as const, field: "price" }] };
}
