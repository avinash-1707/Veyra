import Link from "next/link";

import { SectionShell, StatePanel } from "@/components/marketplace";

import { CatalogUnavailable, ProductList } from "../../page";
import { searchCatalog } from "@/lib/api/server/discovery";

export const dynamic = "force-dynamic";

export default async function CategoryPage(props: PageProps<"/c/[category]">) {
  const { category } = await props.params;
  const result = await searchCatalog(new URLSearchParams({ category })).catch(() => undefined);
  if (result === undefined) return <CatalogUnavailable />;

  const categoryName = result.results[0]?.category.name ?? "Products";

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Category</p>
        <h1>{categoryName}</h1>
        <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
          Browse this shelf with product essentials visible first, then open the detail page for offers, reviews,
          delivery, and policy facts.
        </p>
        <div className="filter-row" aria-label="Category actions">
          <Link href="/">Browse departments</Link>
          <Link href={`/intelligent-search?q=${encodeURIComponent(categoryName)}`}>Use Guided Search</Link>
        </div>
      </section>
      {result.total === 0 ? (
        <StatePanel
          title="No products are available here"
          description="Choose another category or use Guided Search to describe what you need."
          action={<Link href="/">Browse departments</Link>}
        />
      ) : (
        <SectionShell
          eyebrow={`${result.total.toLocaleString("en-IN")} products`}
          title={`Available in ${categoryName}`}
          description="Structured cards keep product information clear as you compare products."
        >
          <ProductList products={result.results} />
        </SectionShell>
      )}
    </main>
  );
}
