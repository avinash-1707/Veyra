import { afterEach, describe, expect, it, vi } from "vitest";

import { getSearchSuggestions } from "../../api/client/discovery";
import { discoveryQueryKeys, searchSuggestionsQueryOptions } from "../discovery";

describe("search suggestions query", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the same-origin adapter and gives each normalized search its own cache key", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [{ type: "category", value: "Laptops" }] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSearchSuggestions("travel laptops")).resolves.toEqual([{ type: "category", value: "Laptops" }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/search/suggestions?q=travel%20laptops");

    expect(discoveryQueryKeys.searchSuggestions("travel laptops")).toEqual([
      "discovery",
      "search-suggestions",
      "travel laptops"
    ]);
    expect(searchSuggestionsQueryOptions("").enabled).toBe(false);
    expect(searchSuggestionsQueryOptions("travel laptops").staleTime).toBe(30_000);
  });
});
