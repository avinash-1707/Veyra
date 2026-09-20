import Link from "next/link";

import { CatalogUnavailable, ProductList } from "../page";
import { intelligentSearch } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function IntelligentSearchPage(props: PageProps<"/intelligent-search">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  if (query.trim().length === 0)
    return (
      <main className="page-shell">
        <h1>Intelligent search</h1>
        <form action="/intelligent-search" className="search-form">
          <label className="sr-only" htmlFor="intent-query">
            Describe what you need
          </label>
          <input id="intent-query" name="q" placeholder="Laptop under ₹1.2 lakh with good battery" />
          <button type="submit">Get guidance</button>
        </form>
      </main>
    );
  const result = await intelligentSearch(query).catch(() => undefined);
  if (result === undefined) return <CatalogUnavailable />;
  return (
    <main className="page-shell">
      <p className="eyebrow">Optional guidance · deterministic fallback active</p>
      <h1>Intelligent search</h1>
      <form action="/intelligent-search" className="search-form">
        <label className="sr-only" htmlFor="intent-query">
          Describe what you need
        </label>
        <input id="intent-query" name="q" defaultValue={query} />
        <button type="submit">Update guidance</button>
      </form>
      <section aria-labelledby="interpretation">
        <h2 id="interpretation">Your editable interpretation</h2>
        <p>
          Recognized filters:{" "}
          {Object.entries(result.intent.filters)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ") || "none"}
        </p>
        <p>Preferences: {result.intent.preferences.join(", ") || "none recognized"}</p>
        {result.intent.uncertainty.map((item) => (
          <p key={item}>{item}</p>
        ))}
        <p>
          <Link href={`/search?q=${encodeURIComponent(query)}`}>Use conventional search and filters instead</Link>
        </p>
      </section>
      {result.results.length === 0 ? (
        <section className="state">
          <p>No guided matches. Edit the query or use conventional filters.</p>
        </section>
      ) : (
        <>
          <section aria-labelledby="reasons">
            <h2 id="reasons">Why these results</h2>
            <ul>
              {result.results.map((entry) => (
                <li key={entry.product.slug}>
                  <strong>{entry.product.title}</strong>: {entry.reasons.join(" ")} Trade-off: {entry.tradeoff}
                </li>
              ))}
            </ul>
          </section>
          <ProductList products={result.results.map((entry) => entry.product)} />
        </>
      )}
    </main>
  );
}
