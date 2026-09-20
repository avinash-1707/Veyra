import Link from "next/link";

import { CatalogUnavailable } from "../../../../page";
import { getReturnRequest } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function ReturnDetailPage(props: { params: Promise<{ orderId: string; returnId: string }> }) {
  const { orderId, returnId } = await props.params;
  const request = await getReturnRequest(returnId).catch(() => undefined);
  if (request === undefined || request.orderId !== orderId) return <CatalogUnavailable />;

  return (
    <main className="page-shell product-detail">
      <Link href={`/orders/${orderId}`}>← Order details</Link>
      <p className="eyebrow">Simulated return</p>
      <h1>Return {request.id.slice(0, 8)}</h1>
      <p>
        {request.item.productTitle} · {request.item.variantName}
      </p>
      <p>
        Reason: {request.reason} · Refund: {request.refundStatus}
      </p>
      <section aria-labelledby="return-timeline">
        <h2 id="return-timeline">Return timeline</h2>
        <ol>
          {request.history.map((entry) => (
            <li key={`${entry.at}-${entry.status}`}>
              <strong>{entry.status}</strong> · {new Date(entry.at).toLocaleString("en-IN")}
              <p>{entry.message}</p>
            </li>
          ))}
        </ol>
      </section>
      <p>This is a local simulated return and refund workflow; no real payment is involved.</p>
    </main>
  );
}
