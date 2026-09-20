import Link from "next/link";

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
      <h1>Search results</h1>
      <form action="/search" className="search-form">
        <label className="sr-only" htmlFor="search-query">
          Search products
        </label>
        <input id="search-query" name="q" defaultValue={result.query} />
        <button type="submit">Search</button>
      </form>
      <div className="filter-row">
        <Link href="?sort=price_asc">Price: low to high</Link>
        <Link href="?sort=rating_desc">Top rated</Link>
        <Link href="/search">Clear filters</Link>
      </div>
      {result.total === 0 ? (
        <section className="state">
          <h2>No results found</h2>
          <p>Try different words or clear a filter.</p>
        </section>
      ) : (
        <ProductList products={result.results} />
      )}
    </main>
  );
}
