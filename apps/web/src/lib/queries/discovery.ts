import { queryOptions } from "@tanstack/react-query";

import { getSearchSuggestions } from "../api/client/discovery";

export const discoveryQueryKeys = {
  all: ["discovery"] as const,
  searchSuggestions: (query: string) => [...discoveryQueryKeys.all, "search-suggestions", query] as const
};

export function searchSuggestionsQueryOptions(query: string) {
  return queryOptions({
    queryKey: discoveryQueryKeys.searchSuggestions(query),
    queryFn: () => getSearchSuggestions(query),
    enabled: query.length > 0,
    staleTime: 30_000
  });
}
