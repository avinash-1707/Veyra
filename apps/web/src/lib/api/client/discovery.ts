import type { SearchSuggestion } from "../types";

type SuggestionsResponse = { suggestions: SearchSuggestion[] };

export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Suggestions unavailable.");

  const body: unknown = await response.json();
  if (!isSuggestionsResponse(body)) throw new Error("Suggestions response is invalid.");
  return body.suggestions;
}

function isSuggestionsResponse(value: unknown): value is SuggestionsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.suggestions) &&
    value.suggestions.every(
      (suggestion) =>
        isRecord(suggestion) &&
        (suggestion.type === "query" || suggestion.type === "category") &&
        typeof suggestion.value === "string" &&
        suggestion.value.length > 0
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
