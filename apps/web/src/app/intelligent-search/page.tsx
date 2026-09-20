import Link from "next/link";

import { ProductCard, SearchPrimitive, SectionShell, StatePanel } from "@/components/marketplace";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { intelligentSearch } from "@/lib/api/server/intelligence";
import { formatInr } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function IntelligentSearchPage(props: PageProps<"/intelligent-search">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q : "";

  if (query.trim().length === 0) return <GuidedSearchEmptyState />;

  const result = await intelligentSearch(query).catch(() => undefined);
  if (result === undefined) return <GuidedSearchUnavailable />;

  const recognizedFilters = Object.entries(result.intent.filters).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined
  );

  return (
    <main className="page-shell">
      <header className="guided-search-results-header">
        <p className="eyebrow">Guided Search</p>
        <h1>Results for “{query}”</h1>
        <p className="text-muted-foreground">{result.results.length.toLocaleString("en-IN")} catalog matches.</p>
      </header>
      <SearchPrimitive
        action="/intelligent-search"
        defaultValue={query}
        id="guided-search-query"
        label="Refine Guided Search"
        placeholder="Describe what you need"
        submitLabel="Search"
      />
      {result.results.length === 0 ? (
        <StatePanel
          title="No matches for your needs"
          description="Try a product, brand, category, budget, or the need you want it to solve."
          action={
            <Link className={cn(buttonVariants({ variant: "outline" }))} href="/">
              Browse departments
            </Link>
          }
        />
      ) : (
        <SectionShell
          eyebrow={`${result.results.length.toLocaleString("en-IN")} matches`}
          title="Matching products"
          description="Review the reasons and tradeoffs, then verify current product, price, delivery, and policy details on each product page."
          className="pt-8"
        >
          <ul className="product-grid">
            {result.results.map((entry) => (
              <li key={entry.product.slug}>
                <ProductCard
                  href={`/p/${entry.product.slug}`}
                  title={entry.product.title}
                  brand={entry.product.brand}
                  category={entry.product.category.name}
                  price={formatInr(entry.product.selectedOffer.price.amountMinor)}
                  rating={`${entry.product.rating.toFixed(1)} ★`}
                  availability={formatGuidedAvailability(entry.product.selectedOffer.availability)}
                  delivery={`Sold by ${entry.product.selectedOffer.sellerName}`}
                  evidence={`${entry.reasons.join(" ")} Tradeoff: ${entry.tradeoff}`}
                  actionLabel="Verify product facts"
                />
              </li>
            ))}
          </ul>
        </SectionShell>
      )}
      <SectionShell
        eyebrow="Editable interpretation"
        title="What Veyra understood"
        description="Review these signals and adjust your search if they do not match what you need."
      >
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:grid-cols-3">
          <div>
            <h3 className="mt-0">Recognized filters</h3>
            <p className="text-sm text-muted-foreground">
              {recognizedFilters.map(([key, value]) => `${key}: ${value}`).join(", ") || "None recognized"}
            </p>
          </div>
          <div>
            <h3 className="mt-0">Preferences</h3>
            <p className="text-sm text-muted-foreground">{result.intent.preferences.join(", ") || "None recognized"}</p>
          </div>
          <div>
            <h3 className="mt-0">Uncertainty</h3>
            {result.intent.uncertainty.length > 0 ? (
              <ul className="grid gap-2 text-sm text-muted-foreground">
                {result.intent.uncertainty.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No uncertainty reported</p>
            )}
          </div>
        </div>
      </SectionShell>
    </main>
  );
}

export function GuidedSearchEmptyState() {
  return (
    <main className="page-shell">
      <section className="guided-search-empty-state" aria-labelledby="guided-search-heading">
        <p className="eyebrow">Guided Search</p>
        <h1 id="guided-search-heading">Find products that fit your needs</h1>
        <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
          Search by product, brand, category, budget, or a plain-language need. Veyra returns catalog matches with
          reasons and tradeoffs.
        </p>
        <SearchPrimitive
          action="/intelligent-search"
          id="guided-search-query"
          label="Search Guided Search"
          placeholder="For example, a travel laptop under ₹120,000"
          submitLabel="Search"
        />
      </section>
    </main>
  );
}

function GuidedSearchUnavailable() {
  return (
    <main className="page-shell">
      <div className="guided-search-results-header">
        <p className="eyebrow">Guided Search</p>
        <h1>Matches for your needs</h1>
      </div>
      <SearchPrimitive
        action="/intelligent-search"
        id="guided-search-query"
        label="Search Guided Search"
        placeholder="Describe what you need"
        submitLabel="Search"
      />
      <p className="catalog-section-error" role="alert">
        Guided Search is temporarily unavailable. Try again or browse departments while it returns.
      </p>
    </main>
  );
}

function formatGuidedAvailability(
  availability: Awaited<
    ReturnType<typeof intelligentSearch>
  >["results"][number]["product"]["selectedOffer"]["availability"]
): string {
  if (availability === "available") return "Available from selected offer";
  if (availability === "withdrawn") return "Offer currently withdrawn";
  return "Currently unavailable";
}
