import Link from "next/link";

import { CatalogUnavailable } from "../page";
import { formatInr, getCart } from "../lib/catalog";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart().catch(() => undefined);
  if (cart === undefined) return <CatalogUnavailable />;

  return <main className="page-shell"><h1>Your cart</h1>{cart.items.length === 0 ? <section className="state"><p>Your cart is empty.</p><Link href="/search">Browse products</Link></section> : <section aria-labelledby="cart-items-heading"><h2 id="cart-items-heading">Items</h2><ul className="product-grid">{cart.items.map((item) => <li key={item.id} className="product-card"><p className="eyebrow">{item.product.category.name}</p><h3><Link href={`/p/${item.product.slug}`}>{item.product.title}</Link></h3><p>{item.product.selectedVariant.name} · Qty {item.quantity}</p><p>{formatInr(item.lineSubtotal.amountMinor)}{item.lineDiscount.amountMinor > 0 ? ` · ${formatInr(item.lineDiscount.amountMinor)} discount` : ""}</p><p>{item.availabilityStatus === "ok" ? "Available for simulated checkout" : "Needs attention before checkout"}</p></li>)}</ul></section>}<section aria-labelledby="saved-heading"><h2 id="saved-heading">Saved for later</h2>{cart.savedForLater.length === 0 ? <p>No saved items.</p> : <ul>{cart.savedForLater.map((item) => <li key={item.id}><Link href={`/p/${item.product.slug}`}>{item.product.title}</Link> · Qty {item.quantity}</li>)}</ul>}</section><section aria-labelledby="totals-heading" aria-live="polite"><h2 id="totals-heading">Server totals</h2><dl><div><dt>Subtotal</dt><dd>{formatInr(cart.totals.itemSubtotal.amountMinor)}</dd></div><div><dt>Discount</dt><dd>{formatInr(cart.totals.discountTotal.amountMinor)}</dd></div><div><dt>Shipping</dt><dd>{formatInr(cart.totals.shipping.amountMinor)}</dd></div><div><dt>Estimated GST</dt><dd>{formatInr(cart.totals.estimatedTax.amountMinor)}</dd></div><div><dt>Total</dt><dd>{formatInr(cart.totals.grandTotal.amountMinor)}</dd></div></dl><p>{cart.totals.disclosure}</p>{cart.items.length > 0 ? <p><Link href="/checkout">Continue to simulated checkout</Link></p> : null}</section></main>;
}
