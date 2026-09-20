import Link from "next/link";

import { ProductCard, SectionShell, StatePanel } from "@/components/marketplace";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatInr, getCategories, searchCatalog } from "./lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = await Promise.all([getCategories(), searchCatalog(new URLSearchParams())]).catch(() => undefined);
  if (catalog === undefined) return <CatalogUnavailable />;
  const [categories, products] = catalog;

  return (
    <main className="page-shell">
      <section className="hero grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div>
          <p className="eyebrow">India marketplace</p>
          <h1>Find products with the details that matter.</h1>
          <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
            Search above for a product, brand, or category, then browse departments and featured products to compare
            clear product details.
          </p>
        </div>
        <aside
          className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
          aria-label="Marketplace promise"
        >
          <p className="eyebrow">Guided Search</p>
          <h2 className="mt-2 text-2xl">Find products around what matters to you.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Describe your need, budget, and priorities in plain language to see relevant catalog matches with reasons
            and tradeoffs.
          </p>
          <Link className="mt-4 inline-flex font-semibold" href="/intelligent-search">
            Explore Guided Search
          </Link>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Verify current product, price, delivery, and checkout details on the relevant product and checkout pages.
          </p>
        </aside>
      </section>
      <SectionShell
        eyebrow="Browse by department"
        title="Shop categories"
        description="Start with familiar shelves, then narrow by search when you know what matters."
      >
        <ul className="category-list">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link href={`/c/${category.slug}`}>
                <span className="block text-base">{category.name}</span>
                <span className="mt-2 block text-sm font-normal text-muted-foreground">View available products</span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionShell>
      <SectionShell
        eyebrow="Editorial picks"
        title="Featured products"
        description="Scan product essentials before opening a detail page."
        action={
          <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href="/">
            Browse departments
          </Link>
        }
      >
        <ProductList products={products.results} />
      </SectionShell>
    </main>
  );
}

export function ProductList({ products }: { products: Awaited<ReturnType<typeof searchCatalog>>["results"] }) {
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product.slug}>
          <ProductCard
            href={`/p/${product.slug}`}
            title={product.title}
            brand={product.brand}
            category={product.category.name}
            price={formatInr(product.selectedOffer.price.amountMinor)}
            rating={`${product.rating.toFixed(1)} ★`}
            availability={formatAvailability(product.selectedOffer.availability)}
            delivery={`Sold by ${product.selectedOffer.sellerName}`}
            evidence={`${product.reviewCount.toLocaleString("en-IN")} shopper reviews`}
          />
        </li>
      ))}
    </ul>
  );
}

function formatAvailability(
  availability: Awaited<ReturnType<typeof searchCatalog>>["results"][number]["selectedOffer"]["availability"]
): string {
  if (availability === "available") return "Available from selected offer";
  if (availability === "withdrawn") return "Offer currently withdrawn";
  return "Currently unavailable";
}

export function CatalogUnavailable() {
  return (
    <main className="page-shell">
      <StatePanel
        title="Catalog is temporarily unavailable"
        description="Try again shortly. Search and browsing will be available when the catalog returns."
        tone="danger"
        action={
          <Link className={cn(buttonVariants({ variant: "outline" }))} href="/">
            Retry catalog
          </Link>
        }
      />
    </main>
  );
}
