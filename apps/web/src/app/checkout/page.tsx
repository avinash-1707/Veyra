import Link from "next/link";

import { CatalogUnavailable } from "../page";
import { formatInr, getCart } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCart().catch(() => undefined);
  if (cart === undefined) return <CatalogUnavailable />;

  return <main className="page-shell"><h1>Simulated checkout</h1>{cart.items.length === 0 ? <section className="state"><p>Add an item before checkout.</p><Link href="/search">Browse products</Link></section> : <><section aria-labelledby="address-heading"><h2 id="address-heading">Delivery address</h2><p>A complete Indian address is required. API checkout quotes validate recipient name, line 1, city, state, and six-digit PIN code before confirmation.</p></section><section aria-labelledby="payment-heading"><h2 id="payment-heading">Mock payment</h2><p>Use the mock success method for local confirmation. Mock failures clearly state no real card was charged.</p></section><section aria-labelledby="review-heading"><h2 id="review-heading">Review items</h2><ul>{cart.items.map((item) => <li key={item.id}>{item.product.title} · {item.product.selectedVariant.name} · Qty {item.quantity} · {formatInr(item.lineSubtotal.amountMinor)}</li>)}</ul></section><section aria-labelledby="totals-heading"><h2 id="totals-heading">Quote-ready totals</h2><dl><div><dt>Subtotal</dt><dd>{formatInr(cart.totals.itemSubtotal.amountMinor)}</dd></div><div><dt>Discount</dt><dd>{formatInr(cart.totals.discountTotal.amountMinor)}</dd></div><div><dt>Shipping</dt><dd>{formatInr(cart.totals.shipping.amountMinor)}</dd></div><div><dt>Estimated GST</dt><dd>{formatInr(cart.totals.estimatedTax.amountMinor)}</dd></div><div><dt>Total</dt><dd>{formatInr(cart.totals.grandTotal.amountMinor)}</dd></div></dl><p>{cart.totals.disclosure}</p></section><p><Link href="/orders">View confirmed orders</Link></p></>}</main>;
}
