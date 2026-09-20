import Link from "next/link";

import { SectionShell, StatePanel, TimelineList } from "@/components/marketplace";
import { buttonVariants } from "@/components/ui/button";

export default async function OrderHelpPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;

  return (
    <main className="page-shell product-detail">
      <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={`/orders/${orderId}`}>
        Back to order details
      </Link>

      <section className="hero py-8">
        <p className="eyebrow">Order self service</p>
        <h1>Help with order {orderId.slice(0, 8)}.</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Tracking, cancellation, returns, and refund status use deterministic policy. Support guidance proposes an action first, and confirmation stays separate.
        </p>
      </section>

      <SectionShell
        eyebrow="Policy checks"
        title="Before support changes anything"
        description="Veyra keeps support mutations explicit, replay safe, and scoped to this order."
      >
        <TimelineList
          items={[
            {
              title: "Read current order state",
              description: "Use the order detail timeline and return list to inspect the latest server state.",
              state: "complete"
            },
            {
              title: "Explain eligibility",
              description: "If cancellation, return, or refund help is not allowed, the page explains the policy reason without exposing another shopper order.",
              state: "current"
            },
            {
              title: "Require confirmation",
              description: "A support proposal never mutates the order by itself. A separate confirmation is required for every supported change.",
              state: "pending"
            }
          ]}
        />
      </SectionShell>

      <StatePanel
        title="Use the order page for available actions"
        description="This page explains the safety boundary. Action controls only appear when the underlying order or return API supports them."
        tone="info"
        action={
          <Link className={buttonVariants({ variant: "outline" })} href={`/orders/${orderId}`}>
            Review order state
          </Link>
        }
      />
    </main>
  );
}
