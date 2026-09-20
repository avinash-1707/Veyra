import Link from "next/link";

import { SectionShell, StatePanel, TimelineList, TotalsCard } from "@/components/marketplace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CatalogUnavailable } from "../page";
import { getCart } from "@/lib/api/server/commerce";
import { formatInr } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCart().catch(() => undefined);
  if (cart === undefined) return <CatalogUnavailable />;

  const totalRows = [
    {
      label: "Subtotal",
      value: formatInr(cart.totals.itemSubtotal.amountMinor),
      helper: "Server cart before delivery and GST"
    },
    {
      label: "Discount",
      value: formatInr(cart.totals.discountTotal.amountMinor),
      helper: "Applied by the commerce API"
    },
    { label: "Delivery", value: formatInr(cart.totals.shipping.amountMinor), helper: "PIN aware simulated delivery" },
    {
      label: "Estimated GST",
      value: formatInr(cart.totals.estimatedTax.amountMinor),
      helper: "India INR checkout estimate"
    }
  ] as const;

  return (
    <main className="page-shell">
      <section className="hero py-8">
        <p className="eyebrow">Simulated checkout</p>
        <h1>Review delivery, mock payment, and totals before confirmation.</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Checkout is a deterministic prototype flow. The API validates Indian address fields, creates a quote, and
          records simulated payment status without storing real card data.
        </p>
      </section>

      {cart.items.length === 0 ? (
        <StatePanel
          title="Add an item before checkout"
          description="Checkout needs at least one cart line so the server can create a quote and preserve order snapshots."
          action={
            <Link className={buttonVariants()} href="/">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="grid gap-8">
            <SectionShell
              eyebrow="Quote requirements"
              title="Checkout safety checks"
              description="These constraints are enforced by the checkout API before any simulated order can be confirmed."
            >
              <TimelineList
                items={[
                  {
                    title: "Complete Indian delivery address",
                    description:
                      "Recipient name, address line 1, city, state, and a six digit PIN code are required before quote confirmation.",
                    state: "current"
                  },
                  {
                    title: "Mock payment outcome",
                    description:
                      "Use the mock success method for local confirmation. Mock failure states clearly say no real card was charged.",
                    state: "pending"
                  },
                  {
                    title: "Server totals are final for the quote",
                    description:
                      "Subtotal, discounts, delivery, estimated GST, and grand total are calculated by the API, not the browser.",
                    state: "pending"
                  }
                ]}
              />
            </SectionShell>

            <SectionShell
              eyebrow="Order preview"
              title="Items in this checkout"
              description="Offer and variant snapshots are preserved when a simulated order is confirmed."
            >
              <ul className="grid gap-4" aria-label="Checkout items">
                {cart.items.map((item) => (
                  <li key={item.id}>
                    <Card className="border-border shadow-[var(--shadow-card)]">
                      <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="eyebrow">{item.product.category.name}</p>
                            <CardTitle className="mt-2 text-xl">{item.product.title}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.product.selectedVariant.name} · Sold by {item.product.selectedOffer.sellerName}
                            </p>
                          </div>
                          <Badge variant={item.availabilityStatus === "ok" ? "secondary" : "destructive"}>
                            {item.availabilityStatus === "ok" ? "Quote ready" : "Revalidation needed"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-border bg-secondary p-3">
                            <dt className="text-xs font-semibold text-muted-foreground">Quantity</dt>
                            <dd className="mt-1 text-lg font-semibold">{item.quantity}</dd>
                          </div>
                          <div className="rounded-lg border border-border bg-secondary p-3">
                            <dt className="text-xs font-semibold text-muted-foreground">Line subtotal</dt>
                            <dd className="mt-1 text-lg font-semibold">{formatInr(item.lineSubtotal.amountMinor)}</dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </SectionShell>
          </div>

          <aside className="lg:sticky lg:top-28" aria-label="Quote ready totals">
            <TotalsCard
              title="Quote ready totals"
              rows={totalRows}
              total={{ label: "Estimated total", value: formatInr(cart.totals.grandTotal.amountMinor) }}
              disclosure={cart.totals.disclosure}
            />
            <Link className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-4 w-full`} href="/orders">
              View confirmed orders
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Confirmation happens through the checkout API. This page does not collect card numbers or claim real
              delivery.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
