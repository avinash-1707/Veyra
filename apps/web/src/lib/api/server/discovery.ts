import "server-only";

import { apiGet } from "./client";
import type { Category, Product, SearchResult, SearchSuggestion } from "../types";

const unavailableMessage = "Catalog service is unavailable.";

export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  return apiGet<SearchSuggestion[]>(`/v1/search/suggestions?q=${encodeURIComponent(query)}`, { unavailableMessage });
}

export async function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/v1/categories", { unavailableMessage });
}

export async function searchCatalog(search: URLSearchParams): Promise<SearchResult> {
  const query = search.toString();
  return apiGet<SearchResult>(`/v1/search${query.length > 0 ? `?${query}` : ""}`, { unavailableMessage });
}

export async function getProduct(slug: string, search: URLSearchParams): Promise<Product> {
  const query = search.toString();
  return apiGet<Product>(`/v1/products/${encodeURIComponent(slug)}${query.length > 0 ? `?${query}` : ""}`, {
    unavailableMessage
  });
}

export async function getEvaluation(slug: string): Promise<{
  product: Product;
  reviews: Array<{
    id: string;
    rating: number;
    title: string;
    body: string;
    authorDisplayName: string;
    verifiedPurchase: boolean;
  }>;
  questions: Array<{ id: string; question: string; answer: string | null }>;
  relatedProducts: Array<SearchResult["results"][number] & { specifications: Record<string, string | null> }>;
}> {
  return apiGet(`/v1/products/${encodeURIComponent(slug)}/evaluation`, { unavailableMessage });
}

export async function compareCatalog(slugs: string[]): Promise<{
  products: Array<SearchResult["results"][number] & { specifications: Record<string, string | null> }>;
  fieldOrder: string[];
}> {
  return apiGet(`/v1/compare?products=${encodeURIComponent(slugs.join(","))}`, { unavailableMessage });
}
