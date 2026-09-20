import { CatalogUnavailable, ProductList } from "../../page";
import { searchCatalog } from "../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function CategoryPage(props: PageProps<"/c/[category]">) {
  const { category } = await props.params;
  const result = await searchCatalog(new URLSearchParams({ category })).catch(() => undefined);
  if (result === undefined) return <CatalogUnavailable />;

  return (
    <main className="page-shell">
      <p className="eyebrow">Category</p>
      <h1>{result.results[0]?.category.name ?? "Products"}</h1>
      {result.total === 0 ? (
        <section className="state">
          <h2>No products are available here</h2>
          <p>Choose another category or search the catalog.</p>
        </section>
      ) : (
        <ProductList products={result.results} />
      )}
    </main>
  );
}
