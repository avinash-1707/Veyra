import Link from "next/link";

import { GuidanceEvidencePanel, SectionShell, StatePanel } from "@/components/marketplace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const productFacts = comparison.products.map((product) => ({
    product,
    rows: [
      { label: "Price", value: formatInr(product.selectedOffer.price.amountMinor) },
      { label: "Rating", value: `${product.rating.toFixed(1)} ★` },
      { label: "Availability", value: product.selectedOffer.availability },
      ...comparison.fieldOrder.map((field) => ({ label: field, value: product.specifications[field] ?? "Unavailable" }))
    ]
  }));

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="compare-heading">
        <p className="eyebrow">Product factsheets</p>
        <h1 id="compare-heading">Compare products</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Compare up to three normalized factsheets. Missing facts stay visible as unavailable rather than inferred.
        </p>
      </section>

      <div className="mb-8">
        {guidance === undefined ? (
          <StatePanel
            title="Optional comparison guidance unavailable"
            description="The facts table remains available. Veyra does not fabricate a comparison when guidance is unavailable."
            tone="info"
          />
        ) : (
          <GuidanceEvidencePanel
            title="Optional grounded comparison guidance"
            summary={guidance.summary}
            evidence={guidance.uncertainties}
            fallback="This guidance is evidence based and optional. It does not set prices, availability, delivery promises, policies, or inventory."
          />
        )}
      </div>

      <SectionShell
        eyebrow="Accessible table"
        title="Facts table"
        description="The table scrolls horizontally on narrow screens and repeats unavailable values as text so missing facts remain inspectable."
      >
        <div className="compare-table" role="region" aria-label="Product comparison" tabIndex={0}>
          <Table className="min-w-2xl">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Fact</TableHead>
                {comparison.products.map((product) => (
                  <TableHead key={product.slug} scope="col" className="min-w-48 whitespace-normal">
                    <Link className="text-foreground" href={`/p/${product.slug}`}>
                      {product.title}
                    </Link>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">{product.brand}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableHead scope="row">Price</TableHead>
                {comparison.products.map((product) => (
                  <TableCell key={product.slug}>{formatInr(product.selectedOffer.price.amountMinor)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHead scope="row">Rating</TableHead>
                {comparison.products.map((product) => (
                  <TableCell key={product.slug}>{product.rating.toFixed(1)} ★</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHead scope="row">Availability</TableHead>
                {comparison.products.map((product) => (
                  <TableCell key={product.slug}>{product.selectedOffer.availability}</TableCell>
                ))}
              </TableRow>
              {comparison.fieldOrder.map((field) => (
                <TableRow key={field}>
                  <TableHead scope="row" className="whitespace-normal">
                    {field}
                  </TableHead>
                  {comparison.products.map((product) => (
                    <TableCell key={product.slug} className="whitespace-normal">
                      {product.specifications[field] ?? "Unavailable"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Mobile reading aid"
        title="Product by product facts"
        description="These cards repeat the same comparison facts for narrow screens and assistive scanning without hiding unavailable values."
      >
        <ul className="grid gap-4 lg:grid-cols-3">
          {productFacts.map(({ product, rows }) => (
            <li key={product.slug}>
              <Card className="h-full border-border shadow-[var(--shadow-card)]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">{product.category.name}</p>
                      <CardTitle className="mt-2 text-lg">
                        <Link className="text-foreground no-underline" href={`/p/${product.slug}`}>
                          {product.title}
                        </Link>
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{product.brand}</p>
                    </div>
                    <Badge variant="secondary">{product.rating.toFixed(1)} ★</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-1">
                    {rows.map((row) => (
                      <div key={row.label} className="marketplace-dl-row">
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </SectionShell>

      <p className="mt-8">
        <Link className={buttonVariants({ variant: "outline" })} href="/search">
          Add another product from search
        </Link>
      </p>
    </main>
  );
}
