import Link from "next/link";

import { CatalogUnavailable } from "../../page";
import { formatInr, getOrder, getOrderReturns } from "../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  const order = await getOrder(orderId).catch(() => undefined);
  if (order === undefined) return <CatalogUnavailable />;
  const returns = await getOrderReturns(orderId).catch(() => []);

  return (
    <main className="page-shell product-detail">
      <Link href="/orders">← All orders</Link>
      <p className="eyebrow">{order.status}</p>
      <h1>Order {order.id.slice(0, 8)}</h1>
      <p>
        Payment: {order.paymentStatus} · Delivery: {order.deliverySpeed}
      </p>
      <section aria-labelledby="items-heading">
        <h2 id="items-heading">Items</h2>
        <ul>
          {order.items.map((item) => (
            <li key={`${item.productTitle}-${item.variantName}`}>
              {item.productTitle} · {item.variantName} · {item.sellerName} · Qty {item.quantity} ·{" "}
              {formatInr(item.lineSubtotal.amountMinor)}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="address-heading">
        <h2 id="address-heading">Delivery address snapshot</h2>
        <p>
          {order.shippingAddress.recipientName}
          <br />
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pinCode}
        </p>
      </section>
      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">Timeline and audit trail</h2>
        <ol>
          {order.history.map((entry) => (
            <li key={`${entry.at}-${entry.status}`}>
              <strong>{entry.status}</strong> · {new Date(entry.at).toLocaleString("en-IN")}
              <p>{entry.message}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="post-purchase-heading">
        <h2 id="post-purchase-heading">Returns and reviews</h2>
        {order.status === "delivered" ? (
          <p>Delivered items can receive one verified review or a simulated refund return within 30 days.</p>
        ) : (
          <p>Return and verified-review eligibility begins after simulated delivery.</p>
        )}
        {returns.length === 0 ? (
          <p>No return requests for this order.</p>
        ) : (
          <ul>
            {returns.map((request) => (
              <li key={request.id}>
                <Link href={`/orders/${order.id}/returns/${request.id}`}>Return {request.id.slice(0, 8)}</Link> ·{" "}
                {request.state} · refund {request.refundStatus}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link href={`/orders/${order.id}/help`}>Get help with this order</Link>
        </p>
      </section>
      <section aria-labelledby="total-heading">
        <h2 id="total-heading">Receipt total</h2>
        <p>{formatInr(order.totals.grandTotal.amountMinor)}</p>
        <p>{order.totals.disclosure}</p>
      </section>
    </main>
  );
}
