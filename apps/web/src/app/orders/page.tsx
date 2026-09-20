import Link from "next/link";

import { SectionShell, StatePanel } from "@/components/marketplace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { CatalogUnavailable } from "../page";
import { formatInr, getOrders } from "../lib/catalog";

export const dynamic = "force-dynamic";

const orderStatusLabel: Record<string, string> = {
  confirmed: "Confirmed",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

export default async function OrdersPage() {
  const orders = await getOrders().catch(() => undefined);
  if (orders === undefined) return <CatalogUnavailable />;

  return (
    <main className="page-shell">
      <section className="hero py-8">
        <p className="eyebrow">Post purchase</p>
        <h1>Your orders stay readable after checkout.</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Track simulated fulfillment, inspect receipt totals, and start policy guided help from each order detail page.
        </p>
      </section>

      {orders.length === 0 ? (
        <StatePanel
          title="No confirmed orders in this local session"
          description="Orders appear after simulated checkout confirmation. Cart and checkout remain available without AI guidance."
          action={
            <Link className={buttonVariants()} href="/cart">
              Return to cart
            </Link>
          }
        />
      ) : (
        <SectionShell
          eyebrow={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
          title="Order history"
          description="Each card shows status, payment state, item count, and the server recorded total."
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Orders">
            {orders.map((order) => (
              <li key={order.id}>
                <Card className="h-full border-border shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--motion-standard)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">Order {order.id.slice(0, 8)}</p>
                        <CardTitle className="mt-2 text-xl">
                          <Link className="text-foreground no-underline" href={`/orders/${order.id}`}>
                            {orderStatusLabel[order.status] ?? order.status}
                          </Link>
                        </CardTitle>
                      </div>
                      <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm text-muted-foreground">
                    <p className="text-2xl font-semibold text-foreground">{formatInr(order.totals.grandTotal.amountMinor)}</p>
                    <p>{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
                    <p>Placed {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                    <p>Delivery speed: {order.deliverySpeed}</p>
                  </CardContent>
                  <CardFooter>
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/orders/${order.id}`}>
                      View order details
                    </Link>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        </SectionShell>
      )}
    </main>
  );
}
