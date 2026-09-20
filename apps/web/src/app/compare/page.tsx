import Link from "next/link";

import { CatalogUnavailable } from "../page";
import { compareCatalog, formatInr, getComparisonGuidance } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function ComparePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const productsParameter = typeof searchParams.products === "string" ? searchParams.products : "";
  const comparison = await compareCatalog(productsParameter.split(",").filter(Boolean)).catch(() => undefined);
  if (comparison === undefined) return <CatalogUnavailable />;
  const guidance = await getComparisonGuidance(comparison.products.map((product) => product.slug)).catch(
    () => undefined
  );

  return (
    <main className="page-shell">
      <h1>Compare products</h1>
      <p>Compare up to three normalized factsheets. Missing facts are shown as unavailable rather than inferred.</p>
      {guidance === undefined ? (
        <p>Optional comparison guidance is unavailable. The facts table remains available.</p>
      ) : (
        <section aria-labelledby="guidance-heading">
          <h2 id="guidance-heading">Optional grounded guidance</h2>
          <p>{guidance.summary}</p>
          {guidance.uncertainties.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
      )}
      <div className="compare-table" role="region" aria-label="Product comparison" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Fact</th>
              {comparison.products.map((product) => (
                <th key={product.slug} scope="col">
                  <Link href={`/p/${product.slug}`}>{product.title}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Price</th>
              {comparison.products.map((product) => (
                <td key={product.slug}>{formatInr(product.selectedOffer.price.amountMinor)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Rating</th>
              {comparison.products.map((product) => (
                <td key={product.slug}>{product.rating.toFixed(1)} ★</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Availability</th>
              {comparison.products.map((product) => (
                <td key={product.slug}>{product.selectedOffer.availability}</td>
              ))}
            </tr>
            {comparison.fieldOrder.map((field) => (
              <tr key={field}>
                <th scope="row">{field}</th>
                {comparison.products.map((product) => (
                  <td key={product.slug}>{product.specifications[field] ?? "Unavailable"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <Link href="/search">Add another product from search</Link>
      </p>
    </main>
  );
}
