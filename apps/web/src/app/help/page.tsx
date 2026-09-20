import Link from "next/link";

import { SectionShell, StatePanel, TimelineList } from "@/components/marketplace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <main className="page-shell product-detail">
      <section className="hero py-8">
        <p className="eyebrow">Self service help</p>
        <h1>Resolve order questions with clear policy boundaries.</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Veyra support starts from your order state. Tracking, cancellation, returns, refunds, and support proposals stay deterministic and require confirmation before anything changes.
        </p>
        <p className="mt-6">
          <Link className={buttonVariants()} href="/orders">
            Open your orders
          </Link>
        </p>
      </section>

      <SectionShell
        eyebrow="Available actions"
        title="What support can do"
        description="Every action is constrained by order state, return policy, and shopper confirmation."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              View the order timeline and audit trail from the order detail page.
            </CardContent>
          </Card>
          <Card className="border-border shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Cancellation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Available only before simulated shipment and only after a separate confirmation.
            </CardContent>
          </Card>
          <Card className="border-border shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Return and refund</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Delivered items are eligible for 30 days. Refunds follow simulated receipt and approval.
            </CardContent>
          </Card>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Safety model"
        title="How Veyra handles support changes"
        description="Policy constraints are shown before any mutation, and ineligible actions explain why."
      >
        <TimelineList
          items={[
            {
              title: "Inspect order state",
              description: "Use the order timeline, payment status, delivery speed, and return list to understand the current state.",
              state: "complete"
            },
            {
              title: "Review policy constraints",
              description: "Veyra shows whether cancellation, delivery edits, returns, or refunds are eligible for that order.",
              state: "current"
            },
            {
              title: "Confirm separately",
              description: "Support guidance can propose an action, but mutation confirmation is always a distinct step.",
              state: "pending"
            }
          ]}
        />
      </SectionShell>

      <StatePanel
        title="No real payment or shipping commitment"
        description="This help center belongs to the India INR prototype. Support, delivery, refunds, and payment states are simulated until production integrations are approved."
        tone="info"
      />
    </main>
  );
}
