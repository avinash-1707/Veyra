import Link from "next/link";

import { getCategories, searchCatalog } from "./lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = await Promise.all([getCategories(), searchCatalog(new URLSearchParams())]).catch(() => undefined);
  if (catalog === undefined) return <CatalogUnavailable />;
  const [categories, products] = catalog;

  return <main className="page-shell"><section className="hero"><p className="eyebrow">India · simulated marketplace</p><h1>Find what fits your everyday.</h1><form action="/search" className="search-form"><label className="sr-only" htmlFor="home-search">Search products</label><input id="home-search" name="q" placeholder="Search bags, audio, and more" /><button type="submit">Search</button></form></section><section aria-labelledby="categories-heading"><h2 id="categories-heading">Shop categories</h2><ul className="category-list">{categories.map((category) => <li key={category.slug}><Link href={`/c/${category.slug}`}>{category.name}</Link></li>)}</ul></section><section aria-labelledby="featured-heading"><h2 id="featured-heading">Featured products</h2><ProductList products={products.results} /></section></main>;
}

export function ProductList({ products }: { products: Awaited<ReturnType<typeof searchCatalog>>["results"] }) {
  return <ul className="product-grid">{products.map((product) => <li key={product.slug} className="product-card"><p className="eyebrow">{product.category.name}</p><h3><Link href={`/p/${product.slug}`}>{product.title}</Link></h3><p>{product.brand}</p><p>{product.rating.toFixed(1)} ★</p></li>)}</ul>;
}

export function CatalogUnavailable() {
  return <main className="page-shell state"><h1>Catalog is temporarily unavailable</h1><p>Try again shortly. Search and browsing do not depend on AI guidance.</p><Link href="/">Retry</Link></main>;
}
