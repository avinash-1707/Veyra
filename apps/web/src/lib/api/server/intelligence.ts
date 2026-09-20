import "server-only";

import { apiGet } from "./client";
import type { CatalogResult } from "../types";

const unavailableMessage = "Catalog service is unavailable.";

export async function getComparisonGuidance(slugs: string[]): Promise<{ summary: string; uncertainties: string[] }> {
  return apiGet(`/v1/ai/comparison?products=${encodeURIComponent(slugs.join(","))}`, { unavailableMessage });
}

export async function getReviewGuidance(slug: string): Promise<{
  summary: string;
  uncertainties: string[];
  reviewCount: number;
}> {
  return apiGet(`/v1/ai/products/${encodeURIComponent(slug)}/reviews`, { unavailableMessage });
}

export async function intelligentSearch(query: string): Promise<{
  intent: {
    originalQuery: string;
    filters: Record<string, string | number | undefined>;
    preferences: string[];
    uncertainty: string[];
  };
  provider: { status: "disabled"; fallback: "deterministic-baseline" };
  results: Array<{ product: CatalogResult; reasons: string[]; tradeoff: string }>;
}> {
  return apiGet(`/v1/ai/search?q=${encodeURIComponent(query)}`, { unavailableMessage });
}
