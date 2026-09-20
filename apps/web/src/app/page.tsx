import { Suspense } from "react";
import Link from "next/link";

import { ProductCard, ProductCardSkeleton, SectionShell, StatePanel } from "@/components/marketplace";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatInr } from "@/lib/currency";
import { getCategories, searchCatalog } from "@/lib/api/server/discovery";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="page-shell home-page-shell">
      <section className="hero home-hero grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
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
      <Suspense fallback={<HomeCategoriesSkeleton />}>
        <HomeCategoriesSection />
      </Suspense>
      <Suspense fallback={<HomeFeaturedProductsSkeleton />}>
        <HomeFeaturedProductsSection />
      </Suspense>
    </main>
  );
}

export async function HomeCategoriesSection() {
  const categories = await getCategories().catch(() => undefined);

  return (
    <SectionShell
      eyebrow="Browse by department"
      title="Shop categories"
      description="Start with familiar shelves, then narrow by search when you know what matters."
    >
      {categories === undefined ? (
        <CatalogSectionError message="We couldn't load categories. Use the navigation search to keep shopping." />
      ) : (
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
      )}
    </SectionShell>
  );
}

export async function HomeFeaturedProductsSection() {
  const products = await searchCatalog(new URLSearchParams()).catch(() => undefined);

  return (
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
      {products === undefined ? (
        <CatalogSectionError message="We couldn't load featured products. Browse a category or use the navigation search." />
      ) : (
        <ProductList products={products.results} />
      )}
    </SectionShell>
  );
}

export function HomeCategoriesSkeleton() {
  return (
    <SectionShell
      eyebrow="Browse by department"
      title="Shop categories"
      description="Start with familiar shelves, then narrow by search when you know what matters."
    >
      <div className="category-list" role="status" aria-busy="true" aria-label="Loading categories">
        <span className="sr-only">Loading categories</span>
        {Array.from({ length: 4 }, (_, index) => (
          <div className="category-skeleton" key={index} aria-hidden="true">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="mt-3 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function HomeFeaturedProductsSkeleton() {
  return (
    <SectionShell
      eyebrow="Editorial picks"
      title="Featured products"
      description="Scan product essentials before opening a detail page."
    >
      <div role="status" aria-busy="true" aria-label="Loading featured products">
        <span className="sr-only">Loading featured products</span>
        <ul className="product-grid" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <ProductCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

function CatalogSectionError({ message }: { message: string }) {
  return (
    <p className="catalog-section-error" role="alert">
      {message}
    </p>
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
