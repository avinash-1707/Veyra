import Link from "next/link";

import { CatalogUnavailable } from "../page";
import { formatInr, getOrders } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getOrders().catch(() => undefined);
  if (orders === undefined) return <CatalogUnavailable />;

  return <main className="page-shell"><h1>Your orders</h1>{orders.length === 0 ? <section className="state"><p>No confirmed orders in this local session.</p><Link href="/cart">Return to cart</Link></section> : <ul className="product-grid">{orders.map((order) => <li key={order.id} className="product-card"><p className="eyebrow">{order.status}</p><h3><Link href={`/orders/${order.id}`}>Order {order.id.slice(0, 8)}</Link></h3><p>{order.items.length} item(s)</p><p>{formatInr(order.totals.grandTotal.amountMinor)}</p><p>{new Date(order.createdAt).toLocaleString("en-IN")}</p></li>)}</ul>}</main>;
}
