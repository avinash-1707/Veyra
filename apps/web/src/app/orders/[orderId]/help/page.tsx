import Link from "next/link";

export default async function OrderHelpPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  return <main className="page-shell product-detail"><Link href={`/orders/${orderId}`}>← Order details</Link><p className="eyebrow">Order self-service</p><h1>Help with order {orderId.slice(0, 8)}</h1><p>Tracking, cancellation, returns, and refund status use deterministic order policy. Support guidance proposes an action first; confirmation is always separate.</p><p>Use the order timeline and returns section to inspect the current state. If an action is ineligible, it explains why without exposing another shopper&apos;s order.</p></main>;
}
