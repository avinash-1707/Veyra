import Link from "next/link";

import { SectionShell, StatePanel, TotalsCard } from "@/components/marketplace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CatalogUnavailable } from "../page";
import { formatInr, getCart } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart().catch(() => undefined);
  if (cart === undefined) return <CatalogUnavailable />;

  const totalRows = [
    {
      label: "Subtotal",
      value: formatInr(cart.totals.itemSubtotal.amountMinor),
      helper: "Item prices from the server cart"
    },
    {
      label: "Discount",
      value: formatInr(cart.totals.discountTotal.amountMinor),
      helper: "Applied before GST calculation"
    },
    {
      label: "Delivery",
      value: formatInr(cart.totals.shipping.amountMinor),
      helper: "PIN aware simulated delivery charge"
    },
    {
      label: "Estimated GST",
      value: formatInr(cart.totals.estimatedTax.amountMinor),
      helper: "India INR simulation at quote time"
    }
  ] as const;

  return (
    <main className="page-shell">
      <section className="hero py-8">
        <p className="eyebrow">Server checked cart</p>
        <h1>Your cart is priced from saved commerce state.</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Veyra shows server totals only. GST, delivery, discounts, and checkout readiness are recalculated before any
          simulated order is confirmed.
        </p>
      </section>

      {cart.items.length === 0 ? (
        <StatePanel
          title="Your cart is empty"
          description="Use the navigation search or browse departments before starting simulated checkout. Conventional shopping works without AI guidance."
          action={
            <Link className={buttonVariants()} href="/">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <SectionShell
              eyebrow={`${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`}
              title="Items ready for review"
              description="Each line keeps its offer, variant, quantity, discount, and availability status visible before checkout."
            >
              <ul className="grid gap-4" aria-label="Cart items">
                {cart.items.map((item) => {
                  const isAvailable = item.availabilityStatus === "ok";
                  return (
                    <li key={item.id}>
                      <Card className="border-border shadow-[var(--shadow-card)]">
                        <CardHeader>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="eyebrow">{item.product.category.name}</p>
                              <CardTitle className="mt-2 text-xl">
                                <Link className="text-foreground no-underline" href={`/p/${item.product.slug}`}>
                                  {item.product.title}
                                </Link>
                              </CardTitle>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.product.brand} · {item.product.selectedVariant.name} · Sold by{" "}
                                {item.product.selectedOffer.sellerName}
                              </p>
                            </div>
                            <Badge variant={isAvailable ? "secondary" : "destructive"}>
                              {isAvailable ? "Ready for checkout" : "Needs attention"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <dl className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border bg-secondary p-3">
                              <dt className="text-xs font-semibold text-muted-foreground">Quantity</dt>
                              <dd className="mt-1 text-lg font-semibold">{item.quantity}</dd>
                            </div>
                            <div className="rounded-lg border border-border bg-secondary p-3">
                              <dt className="text-xs font-semibold text-muted-foreground">Line subtotal</dt>
                              <dd className="mt-1 text-lg font-semibold">{formatInr(item.lineSubtotal.amountMinor)}</dd>
                            </div>
                            <div className="rounded-lg border border-border bg-secondary p-3">
                              <dt className="text-xs font-semibold text-muted-foreground">Discount</dt>
                              <dd className="mt-1 text-lg font-semibold">{formatInr(item.lineDiscount.amountMinor)}</dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </SectionShell>

            <SectionShell
              eyebrow="Saved list"
              title="Saved for later"
              description="Saved items stay out of server totals until restored through the cart API."
            >
              {cart.savedForLater.length === 0 ? (
                <StatePanel
                  title="No saved items"
                  description="Products you save for later will appear here with their last known quantity."
                />
              ) : (
                <ul className="grid gap-3" aria-label="Saved for later items">
                  {cart.savedForLater.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
                    >
                      <Link className="font-semibold text-foreground no-underline" href={`/p/${item.product.slug}`}>
                        {item.product.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.product.selectedVariant.name} · Qty {item.quantity}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
          </div>

          <aside className="lg:sticky lg:top-28" aria-label="Cart totals">
            <TotalsCard
              rows={totalRows}
              total={{ label: "Estimated total", value: formatInr(cart.totals.grandTotal.amountMinor) }}
              disclosure={cart.totals.disclosure}
            />
            <Link className={`${buttonVariants({ size: "lg" })} mt-4 w-full`} href="/checkout">
              Continue to simulated checkout
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              No real card is charged. Checkout confirmation remains separate from this cart review.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
