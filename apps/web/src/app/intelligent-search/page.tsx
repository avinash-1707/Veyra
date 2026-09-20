import Link from "next/link";

import {
  GuidanceEvidencePanel,
  ProductCard,
  SearchPrimitive,
  SectionShell,
  StatePanel
} from "@/components/marketplace";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CatalogUnavailable } from "../page";
import { intelligentSearch } from "@/lib/api/server/intelligence";
import { formatInr } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function IntelligentSearchPage(props: PageProps<"/intelligent-search">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  if (query.trim().length === 0)
    return (
      <main className="page-shell">
        <section className="hero grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <p className="eyebrow">Guided Search</p>
            <h1>Describe what you are looking for.</h1>
            <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
              Share your product need, budget, use, and priorities in plain language to find catalog matches that fit.
            </p>
            <div className="mt-6">
              <SearchPrimitive
                action="/intelligent-search"
                id="intent-query"
                label="Describe what you need"
                placeholder="Laptop under ₹1.2 lakh for travel with long battery life"
                submitLabel="Find matches"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Looking for a specific product? Use the search field in the navigation.
            </p>
          </div>
          <GuidanceEvidencePanel
            title="Catalog matches with context"
            summary="Tell Veyra what you need, and review the reasons and tradeoffs behind each match."
            evidence={[
              "Your product need, budget, use, and priorities shape the matches.",
              "Open a product page for its current price, delivery, and policy details.",
              "Use search when you know the product, brand, or category you want."
            ]}
          />
        </section>
      </main>
    );
  const result = await intelligentSearch(query).catch(() => undefined);
  if (result === undefined) return <CatalogUnavailable />;
  const recognizedFilters = Object.entries(result.intent.filters).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined
  );

  return (
    <main className="page-shell">
      <section className="hero grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div>
          <p className="eyebrow">Guided Search</p>
          <h1>Matches for your needs</h1>
          <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
            Refine what you need, then review each match and its reasons and tradeoffs.
          </p>
          <div className="mt-6">
            <SearchPrimitive
              action="/intelligent-search"
              id="intent-query"
              label="Describe what you need"
              defaultValue={query}
              submitLabel="Refine your search"
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Use the navigation search to look for a product, brand, or category.
          </p>
        </div>
        <GuidanceEvidencePanel
          title="Guided Search"
          summary="Catalog matches include context to help you compare products."
          evidence={[
            "Review the reasons and tradeoffs for each match.",
            "Verify current product, price, delivery, and policy details on the product page.",
            "Review checkout details before placing an order."
          ]}
        />
      </section>
      <SectionShell
        eyebrow="Editable interpretation"
        title="What Veyra understood"
        description="Review these signals and refine your search if they do not match what you need."
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
      {result.results.length === 0 ? (
        <StatePanel
          title="No matches for your needs"
          description="Refine your search or look for a product, brand, or category."
          action={
            <Link className={cn(buttonVariants({ variant: "outline" }))} href="/">
              Browse departments
            </Link>
          }
        />
      ) : (
        <SectionShell
          eyebrow={`${result.results.length.toLocaleString("en-IN")} matches`}
          title="Matches for your needs"
          description="Review the reasons and tradeoffs, then verify current product, price, delivery, and policy details on each product page."
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
