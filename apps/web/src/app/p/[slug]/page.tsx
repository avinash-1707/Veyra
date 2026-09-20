import Link from "next/link";

import { GuidanceEvidencePanel, ProductCard, SectionShell, StatePanel } from "@/components/marketplace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { CatalogUnavailable } from "../../page";
import { formatInr, getEvaluation, getReviewGuidance } from "../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const evaluation = await getEvaluation(slug).catch(() => undefined);
  if (evaluation === undefined) return <CatalogUnavailable />;
  const product = evaluation.product;
  const reviewGuidance = await getReviewGuidance(slug).catch(() => undefined);
  const ratingLabel = `${product.rating.toFixed(1)} ★`;
  const deliveryCopy =
    product.delivery.status === "address_required"
      ? "Add an Indian delivery address at checkout to see your simulated estimate."
      : product.delivery.disclosure;

  return (
    <main className="page-shell">
      <div className="mb-8">
        <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/search">
          Continue browsing
        </Link>
      </div>

      <section
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
        aria-labelledby="product-heading"
      >
        <div>
          <p className="eyebrow">{product.category.name}</p>
          <h1 id="product-heading">{product.title}</h1>
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{product.brand}</Badge>
            <Badge variant="outline">{ratingLabel}</Badge>
            <span>{product.reviewCount} raw reviews</span>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">{product.description}</p>
        </div>

        <Card className="border-border shadow-[var(--shadow-card)]" aria-labelledby="offer-heading">
          <CardHeader>
            <p className="eyebrow">Selected offer</p>
            <CardTitle id="offer-heading" className="text-2xl">
              {formatInr(product.selectedOffer.price.amountMinor)}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground">
            <dl className="grid gap-3">
              <div className="marketplace-dl-row">
                <dt>Availability</dt>
                <dd>{product.selectedOffer.availability}</dd>
              </div>
              <div className="marketplace-dl-row">
                <dt>Seller</dt>
                <dd>{product.selectedOffer.sellerName}</dd>
              </div>
              <div className="marketplace-dl-row">
                <dt>Delivery</dt>
                <dd>{deliveryCopy}</dd>
              </div>
            </dl>
            <Separator />
            <p>
              Price, availability, delivery, seller terms, and payment outcomes are server facts for this prototype
              flow, not AI guidance.
            </p>
            <Link className={buttonVariants({ variant: "outline" })} href="/cart">
              View cart
            </Link>
          </CardContent>
        </Card>
      </section>

      <SectionShell
        eyebrow="Choose the exact item"
        title="Variants"
        description="Variant links preserve the product URL pattern and let the baseline product path remain usable without AI."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {product.variants.map((variant) => (
            <li key={variant.id}>
              <Link
                className="block rounded-xl border border-border bg-card p-4 text-sm font-semibold text-foreground no-underline shadow-[var(--shadow-card)] transition-[transform,border-color] duration-200 ease-[var(--motion-standard)] hover:-translate-y-0.5 hover:border-primary/40"
                href={`/p/${product.slug}?variant=${variant.id}`}
              >
                {variant.name}
                {variant.id === product.selectedVariant.id ? (
                  <span className="mt-2 block text-xs font-medium text-muted-foreground">Currently selected</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </SectionShell>

      <SectionShell
        eyebrow="Fact sheet"
        title="Specifications"
        description="Unavailable or absent product facts are not inferred. Comparison keeps missing values visible."
        action={
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={`/compare?products=${product.slug}`}
          >
            Compare this product
          </Link>
        }
      >
        <Card className="border-border shadow-[var(--shadow-card)]">
          <CardContent>
            <dl className="grid gap-1">
              {Object.entries(product.specifications).map(([name, value]) => (
                <div key={name} className="marketplace-dl-row">
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </SectionShell>

      <SectionShell
        eyebrow="Evidence before interpretation"
        title="Reviews"
        description="Raw shopper reviews stay primary. Optional guidance is separated and cannot decide price, policy, inventory, or returns."
      >
        <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          {reviewGuidance === undefined ? (
            <StatePanel
              title="Optional review guidance unavailable"
              description="Raw reviews remain available below. Veyra does not fabricate review summaries when guidance is unavailable."
              tone="info"
            />
          ) : (
            <GuidanceEvidencePanel
              title="Optional grounded review guidance"
              summary={reviewGuidance.summary}
              evidence={reviewGuidance.uncertainties}
              fallback="This panel summarizes available review evidence only. It does not set product facts, inventory, policies, delivery dates, or prices."
            />
          )}

          {evaluation.reviews.length === 0 ? (
            <StatePanel title="No raw reviews yet" description="Shopper review text will appear here when submitted." />
          ) : (
            <ul className="grid gap-4">
              {evaluation.reviews.map((review) => (
                <li key={review.id}>
                  <Card className="border-border shadow-[var(--shadow-card)]">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="eyebrow">Raw review</p>
                          <CardTitle className="mt-2">{review.title}</CardTitle>
                        </div>
                        <Badge variant="secondary">{review.rating} ★</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm text-muted-foreground">
                      <p>{review.body}</p>
                      <p>
                        {review.authorDisplayName}
                        {review.verifiedPurchase ? " · verified purchase" : ""}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Shopper questions" title="Questions and answers">
        {evaluation.questions.length === 0 ? (
          <StatePanel
            title="No questions yet"
            description="Answered shopper questions will appear here without AI inference."
          />
        ) : (
          <ul className="grid gap-4">
            {evaluation.questions.map((question) => (
              <li key={question.id}>
                <Card className="border-border shadow-[var(--shadow-card)]">
                  <CardContent className="grid gap-3 text-sm">
                    <p>
                      <span className="font-semibold text-foreground">Question:</span> {question.question}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Answer:</span>{" "}
                      {question.answer ?? "Not answered yet"}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell eyebrow="Keep evaluating" title="Related products">
        {evaluation.relatedProducts.length === 0 ? (
          <StatePanel
            title="No related products"
            description="No related products are available in this local catalog slice."
          />
        ) : (
          <ul className="product-grid">
            {evaluation.relatedProducts.map((related) => (
              <li key={related.slug}>
                <ProductCard
                  href={`/p/${related.slug}`}
                  title={related.title}
                  brand={related.brand}
                  category={related.category.name}
                  price={formatInr(related.selectedOffer.price.amountMinor)}
                  rating={`${related.rating.toFixed(1)} ★`}
                  availability={related.selectedOffer.availability}
                />
              </li>
            ))}
          </ul>
        )}
      </SectionShell>
    </main>
  );
}
