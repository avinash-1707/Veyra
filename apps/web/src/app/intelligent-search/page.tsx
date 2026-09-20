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
import { formatInr, intelligentSearch } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function IntelligentSearchPage(props: PageProps<"/intelligent-search">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  if (query.trim().length === 0)
    return (
      <main className="page-shell">
        <section className="hero grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <p className="eyebrow">Optional guidance</p>
            <h1>Describe the shopping job.</h1>
            <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
              Use this concierge surface when you want help translating needs into catalog filters. You can switch back
              to conventional search at any time.
            </p>
            <div className="mt-6">
              <SearchPrimitive
                action="/intelligent-search"
                id="intent-query"
                label="Describe what you need"
                placeholder="Laptop under ₹1.2 lakh with long battery life"
                submitLabel="Get guidance"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Prefer baseline discovery? <Link href="/search">Use conventional search</Link>.
            </p>
          </div>
          <GuidanceEvidencePanel
            title="Safe by default"
            summary="This route is labelled optional and uses the deterministic catalog fallback while provider calls are disabled."
            evidence={[
              "It cannot change price, stock, delivery, policy, cart, or checkout decisions.",
              "Results link to the same product detail pages used by baseline discovery.",
              "If guidance is unavailable, conventional search remains the recovery path."
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
          <p className="eyebrow">Optional guidance · deterministic fallback active</p>
          <h1>Intelligent search</h1>
          <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
            The interpretation is editable, and every recommendation still opens the normal product route for commerce
            facts.
          </p>
          <div className="mt-6">
            <SearchPrimitive
              action="/intelligent-search"
              id="intent-query"
              label="Describe what you need"
              defaultValue={query}
              submitLabel="Update guidance"
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href={`/search?q=${encodeURIComponent(query)}`}>Use conventional search and filters instead</Link>
          </p>
        </div>
        <GuidanceEvidencePanel
          title="Fallback safe guidance"
          summary="Provider calls are disabled for this local slice, so guidance is generated from deterministic catalog facts."
          evidence={[
            `Provider status: ${result.provider.status}`,
            `Fallback mode: ${result.provider.fallback}`,
            "Price, stock, delivery, cart, and checkout stay server authoritative."
          ]}
        />
      </section>
      <SectionShell
        eyebrow="Editable interpretation"
        title="What Veyra understood"
        description="Review these signals before trusting the order of results. Use baseline search if the interpretation misses your intent."
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
          title="No guided matches"
          description="Edit the query or use conventional filters. Baseline search remains available without guidance."
          action={
            <Link
              className={cn(buttonVariants({ variant: "outline" }))}
              href={`/search?q=${encodeURIComponent(query)}`}
            >
              Open conventional search
            </Link>
          }
        />
      ) : (
        <SectionShell
          eyebrow={`${result.results.length.toLocaleString("en-IN")} guided matches`}
          title="Guided matches from catalog facts"
          description="Reasons and tradeoffs are explanatory only. Open each product to verify current offer, delivery, and policy details."
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
