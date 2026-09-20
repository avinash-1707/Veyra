import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Category, SearchResult } from "../../lib/api/types";

const { getCategories, searchCatalog, intelligentSearch } = vi.hoisted(() => ({
  getCategories: vi.fn(),
  searchCatalog: vi.fn(),
  intelligentSearch: vi.fn()
}));

vi.mock("@/lib/api/server/discovery", () => ({ getCategories, searchCatalog }));
vi.mock("@/lib/api/server/intelligence", () => ({ intelligentSearch }));
vi.mock("@/components/marketplace", () => ({
  GuidanceEvidencePanel: ({ title, summary }: { title: string; summary: string; evidence: string[] }) =>
    createElement("aside", null, title, summary),
  ProductCard: ({ title }: { title: string }) => createElement("article", null, title),
  ProductCardSkeleton: () => createElement("div", null, "Loading product"),
  SearchPrimitive: ({
    action,
    defaultValue,
    id,
    label
  }: {
    action: string;
    defaultValue?: string;
    id: string;
    label: string;
  }) =>
    createElement(
      "form",
      { action },
      createElement("label", { htmlFor: id }, label),
      createElement("input", { defaultValue, id, name: "q" })
    ),
  SectionShell: ({ title, children }: { title: string; children: ReactNode }) =>
    createElement("section", null, createElement("h2", null, title), children),
  StatePanel: ({ title, description, action }: { title: string; description: string; action?: ReactNode }) =>
    createElement("section", null, title, description, action)
}));
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ children }: { children?: ReactNode }) => createElement("div", null, children)
}));
vi.mock("@/components/ui/button", () => ({
  buttonVariants: (_options?: { variant?: string; size?: string }) => "button"
}));
vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | undefined>) => values.filter((value): value is string => value !== undefined).join(" ")
}));
vi.mock("@/lib/currency", () => ({ formatInr: (amountMinor: number) => `₹${amountMinor}` }));

import Home, { HomeCategoriesSkeleton, HomeFeaturedProductsSkeleton } from "../page";
import IntelligentSearchPage from "../intelligent-search/page";

type IntelligentSearchResult = Awaited<ReturnType<typeof intelligentSearch>>;

const categories: Category[] = [{ slug: "electronics", name: "Electronics" }];
const catalog: SearchResult = {
  query: "",
  total: 1,
  results: [
    {
      slug: "travel-laptop",
      title: "Travel Laptop",
      brand: "Veyra",
      category: { slug: "electronics", name: "Electronics" },
      rating: 4.5,
      reviewCount: 14,
      selectedVariant: { id: "variant-1", name: "Base" },
      selectedOffer: {
        id: "offer-1",
        sellerName: "Veyra Store",
        price: { amountMinor: 8999000 },
        availability: "available"
      }
    }
  ]
};
const guidedResult: IntelligentSearchResult = {
  intent: {
    originalQuery: "travel laptop",
    filters: { maxPrice: 120000 },
    preferences: ["long battery life"],
    uncertainty: []
  },
  provider: { status: "disabled", fallback: "deterministic-baseline" },
  results: [{ product: catalog.results[0], reasons: ["Fits the requested budget."], tradeoff: "Weight varies." }]
};

async function renderStream(node: React.ReactNode): Promise<string> {
  const stream = await renderToReadableStream(node);
  return new Response(stream).text();
}

describe("home discovery sections", () => {
  beforeEach(() => {
    getCategories.mockReset();
    searchCatalog.mockReset();
  });

  it("renders categories and featured products as independent sections", async () => {
    getCategories.mockResolvedValue(categories);
    searchCatalog.mockResolvedValue(catalog);

    const markup = await renderStream(createElement(Home));

    expect(markup).toContain("Shop categories");
    expect(markup).toContain("Electronics");
    expect(markup).toContain("Featured products");
    expect(markup).toContain("Travel Laptop");
  });

  it("keeps featured products available when categories fail", async () => {
    getCategories.mockRejectedValue(new Error("categories unavailable"));
    searchCatalog.mockResolvedValue(catalog);

    const markup = await renderStream(createElement(Home));

    expect(markup).toContain("We couldn&#x27;t load categories.");
    expect(markup).toContain("Travel Laptop");
    expect(markup).not.toContain("Retry catalog");
  });

  it("keeps categories available when featured products fail", async () => {
    getCategories.mockResolvedValue(categories);
    searchCatalog.mockRejectedValue(new Error("featured products unavailable"));

    const markup = await renderStream(createElement(Home));

    expect(markup).toContain("Electronics");
    expect(markup).toContain("We couldn&#x27;t load featured products.");
    expect(markup).not.toContain("Retry catalog");
  });

  it("provides separate accessible loading fallbacks without an all-page loading gate", () => {
    const categoryMarkup = renderToStaticMarkup(createElement(HomeCategoriesSkeleton));
    const productMarkup = renderToStaticMarkup(createElement(HomeFeaturedProductsSkeleton));

    expect(categoryMarkup).toContain('aria-label="Loading categories"');
    expect(productMarkup).toContain('aria-label="Loading featured products"');
  });
});

describe("Guided Search entry and result states", () => {
  beforeEach(() => {
    intelligentSearch.mockReset();
  });

  it("renders a compact page search form before queried results", async () => {
    intelligentSearch.mockResolvedValue(guidedResult);
    const props: Parameters<typeof IntelligentSearchPage>[0] = {
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ q: "travel laptop" })
    };

    const markup = renderToStaticMarkup(await IntelligentSearchPage(props));

    expect(markup).toContain('action="/intelligent-search"');
    expect(markup).toContain('name="q"');
    expect(markup).toContain('value="travel laptop"');
    expect(markup).toContain("Results for “travel laptop”");
    expect(markup).toContain("1 catalog matches.");
    expect(markup.indexOf("<h1")).toBeLessThan(markup.indexOf("<form"));
    expect(markup.indexOf("<form")).toBeLessThan(markup.indexOf("Matching products"));
    expect(markup.indexOf("Matching products")).toBeLessThan(markup.indexOf("What Veyra understood"));
  });

  it("renders a page search form and value proposition for an empty search", async () => {
    const props: Parameters<typeof IntelligentSearchPage>[0] = {
      params: Promise.resolve({}),
      searchParams: Promise.resolve({})
    };

    const markup = renderToStaticMarkup(await IntelligentSearchPage(props));

    expect(intelligentSearch).not.toHaveBeenCalled();
    expect(markup).toContain("Find products that fit your needs");
    expect(markup).toContain("Veyra returns catalog matches with");
    expect(markup).toContain('action="/intelligent-search"');
    expect(markup).toContain('name="q"');
    expect(markup.indexOf("<h1")).toBeLessThan(markup.indexOf("<form"));
  });
});
