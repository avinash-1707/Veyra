import Link from "next/link";

import { SectionShell, StatePanel, TimelineList, TotalsCard } from "@/components/marketplace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CatalogUnavailable } from "../../page";
import { formatInr, getOrder, getOrderReturns } from "../../lib/catalog";

export const dynamic = "force-dynamic";

const orderStepOrder = ["confirmed", "preparing", "shipped", "delivered"] as const;

function getTimelineState(status: string, orderStatus: string) {
  if (status === orderStatus) return "current" as const;
  const entryIndex = orderStepOrder.findIndex((step) => step === status);
  const currentIndex = orderStepOrder.findIndex((step) => step === orderStatus);
  if (entryIndex >= 0 && currentIndex >= 0 && entryIndex < currentIndex) return "complete" as const;
  if (orderStatus === "cancelled") return "complete" as const;
  return "pending" as const;
}

export default async function OrderDetailPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  const order = await getOrder(orderId).catch(() => undefined);
  if (order === undefined) return <CatalogUnavailable />;
  const returns = await getOrderReturns(orderId).catch(() => []);

  const totalRows = [
    { label: "Subtotal", value: formatInr(order.totals.itemSubtotal.amountMinor), helper: "Snapshot captured at confirmation" },
    { label: "Discount", value: formatInr(order.totals.discountTotal.amountMinor), helper: "Server applied promotion total" },
    { label: "Delivery", value: formatInr(order.totals.shipping.amountMinor), helper: `${order.deliverySpeed} simulated delivery` },
    { label: "Estimated GST", value: formatInr(order.totals.estimatedTax.amountMinor), helper: "India INR tax estimate" }
  ] as const;

  return (
    <main className="page-shell product-detail">
      <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/orders">
        Back to all orders
      </Link>

      <section className="hero py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Order {order.id.slice(0, 8)}</p>
            <h1>Order status and receipt.</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Payment, address, item, return, and audit details are shown from the server order snapshot.
            </p>
          </div>
          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>{order.status}</Badge>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div>
          <SectionShell
            eyebrow="Receipt items"
            title="Items in this order"
            description="Confirmed orders keep immutable item, seller, quantity, and price snapshots."
          >
            <ul className="grid gap-4" aria-label="Order items">
              {order.items.map((item) => (
                <li key={`${item.productTitle}-${item.variantName}`}>
                  <Card className="border-border shadow-[var(--shadow-card)]">
                    <CardHeader>
                      <CardTitle className="text-xl">{item.productTitle}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {item.variantName} · Sold by {item.sellerName}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-border bg-secondary p-3">
                          <dt className="text-xs font-semibold text-muted-foreground">Quantity</dt>
                          <dd className="mt-1 text-lg font-semibold">{item.quantity}</dd>
                        </div>
                        <div className="rounded-lg border border-border bg-secondary p-3">
                          <dt className="text-xs font-semibold text-muted-foreground">Unit price</dt>
                          <dd className="mt-1 text-lg font-semibold">{formatInr(item.unitPrice.amountMinor)}</dd>
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

          <SectionShell
            eyebrow="Fulfillment"
            title="Timeline and audit trail"
            description="Status changes are deterministic and visible. Color is paired with text for every timeline state."
          >
            <TimelineList
              items={order.history.map((entry) => ({
                title: entry.status,
                description: entry.message,
                meta: new Date(entry.at).toLocaleString("en-IN"),
                state: getTimelineState(entry.status, order.status)
              }))}
            />
          </SectionShell>

          <SectionShell
            eyebrow="Post purchase"
            title="Returns, reviews, and help"
            description="Delivered items can enter refund only return policy. Support mutations require a separate confirmation step."
          >
            <div className="grid gap-4">
              <StatePanel
                title={order.status === "delivered" ? "Delivered order actions are available" : "Return eligibility starts after delivery"}
                description={
                  order.status === "delivered"
                    ? "Delivered items can receive one verified review or a simulated refund return within 30 days."
                    : "Return and verified review eligibility begins after simulated delivery."
                }
                tone={order.status === "delivered" ? "success" : "info"}
              />

              {returns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No return requests for this order.</p>
              ) : (
                <ul className="grid gap-3" aria-label="Return requests">
                  {returns.map((request) => (
                    <li key={request.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <Link className="font-semibold text-foreground no-underline" href={`/orders/${order.id}/returns/${request.id}`}>
                        Return {request.id.slice(0, 8)}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        State {request.state} · Refund {request.refundStatus}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <Link className={buttonVariants({ variant: "outline" })} href={`/orders/${order.id}/help`}>
                Get help with this order
              </Link>
            </div>
          </SectionShell>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-28" aria-label="Order receipt summary">
          <Card className="border-border shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Delivery address snapshot</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              <p className="font-semibold text-foreground">{order.shippingAddress.recipientName}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pinCode}
              </p>
              <p className="mt-4">Payment status: {order.paymentStatus}</p>
            </CardContent>
          </Card>

          <TotalsCard
            title="Receipt total"
            rows={totalRows}
            total={{ label: "Paid in simulation", value: formatInr(order.totals.grandTotal.amountMinor) }}
            disclosure={order.totals.disclosure}
          />
        </aside>
      </div>
    </main>
  );
}
