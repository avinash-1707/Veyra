import Link from "next/link";

import { SearchPrimitive, SectionShell, StatePanel } from "@/components/marketplace";

import { CatalogUnavailable, ProductList } from "../page";
import { searchCatalog } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function SearchPage(props: PageProps<"/search">) {
  const searchParams = await props.searchParams;
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) if (typeof value === "string") parameters.set(key, value);
  const result = await searchCatalog(parameters).catch(() => undefined);
  if (result === undefined) return <CatalogUnavailable />;

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Conventional discovery</p>
        <h1>Search results</h1>
        <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
          Search stays usable on its own. Optional guidance is available only when you choose it.
        </p>
        <div className="mt-6">
          <SearchPrimitive id="search-query" label="Search products" defaultValue={result.query} />
        </div>
        <div className="filter-row" aria-label="Search sort options">
          <Link href="?sort=price_asc">Price: low to high</Link>
          <Link href="?sort=rating_desc">Top rated</Link>
          <Link href="/search">Clear filters</Link>
          <Link href={`/intelligent-search${result.query.length > 0 ? `?q=${encodeURIComponent(result.query)}` : ""}`}>
            Try optional guidance
          </Link>
        </div>
      </section>
      {result.total === 0 ? (
        <StatePanel
          title="No results found"
          description="Try different words, clear a filter, or use guided search for optional suggestions."
          action={<Link href="/search">Clear filters</Link>}
        />
      ) : (
        <SectionShell
          eyebrow={`${result.total.toLocaleString("en-IN")} matching products`}
          title={result.query.length > 0 ? `Results for ${result.query}` : "All products"}
          description="Each card keeps price, seller, rating, and availability visible before you choose a product."
        >
          <ProductList products={result.results} />
        </SectionShell>
      )}
    </main>
  );
}
