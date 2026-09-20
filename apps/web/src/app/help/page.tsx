import Link from "next/link";

export default function HelpPage() {
  return <main className="page-shell product-detail"><p className="eyebrow">Self-service help</p><h1>How can we help?</h1><p>Use an order&apos;s self-service options to track it, request cancellation before shipment, or start a return for an eligible delivered item.</p><section aria-labelledby="help-actions"><h2 id="help-actions">Available actions</h2><ul><li>Tracking: view the order timeline.</li><li>Cancellation: available only before simulated shipment.</li><li>Return and refund: delivered items are eligible for 30 days; refunds follow simulated receipt and approval.</li></ul><p>Before a support action changes an order or return, Veyra shows its policy constraints and requires a separate confirmation.</p></section><p><Link href="/orders">Open your orders</Link></p></main>;
}
