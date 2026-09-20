import Link from "next/link";

import { SectionShell, StatePanel, TimelineList } from "@/components/marketplace";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CatalogUnavailable } from "../../../../page";
import { getReturnRequest } from "@/lib/api/server/returns";

export const dynamic = "force-dynamic";

const returnStepOrder = ["requested", "received", "approved", "refunded"] as const;

function getReturnTimelineState(status: string, currentState: string) {
  if (status === currentState) return "current" as const;
  const entryIndex = returnStepOrder.findIndex((step) => step === status);
  const currentIndex = returnStepOrder.findIndex((step) => step === currentState);
  if (entryIndex >= 0 && currentIndex >= 0 && entryIndex < currentIndex) return "complete" as const;
  if (currentState === "rejected" || currentState === "cancelled") return "complete" as const;
  return "pending" as const;
}

export default async function ReturnDetailPage(props: { params: Promise<{ orderId: string; returnId: string }> }) {
  const { orderId, returnId } = await props.params;
  const request = await getReturnRequest(returnId).catch(() => undefined);
  if (request === undefined || request.orderId !== orderId) return <CatalogUnavailable />;

  return (
    <main className="page-shell product-detail">
      <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={`/orders/${orderId}`}>
        Back to order details
      </Link>

      <section className="hero py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Simulated return</p>
            <h1>Return {request.id.slice(0, 8)}.</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Refund only returns move through requested, received, approved, and refunded states in the prototype
              workflow.
            </p>
          </div>
          <Badge variant={request.state === "rejected" || request.state === "cancelled" ? "destructive" : "secondary"}>
            {request.state}
          </Badge>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <SectionShell
          eyebrow="Return progress"
          title="Return timeline"
          description="Every return state is visible with timestamped audit messages and text labels."
        >
          <TimelineList
            items={request.history.map((entry) => ({
              title: entry.status,
              description: entry.message,
              meta: new Date(entry.at).toLocaleString("en-IN"),
              state: getReturnTimelineState(entry.status, request.state)
            }))}
          />
        </SectionShell>

        <aside className="grid gap-4 lg:sticky lg:top-28" aria-label="Return summary">
          <Card className="border-border shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Return summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3">
                <div className="marketplace-dl-row">
                  <dt>Item</dt>
                  <dd>
                    {request.item.productTitle} · {request.item.variantName}
                  </dd>
                </div>
                <div className="marketplace-dl-row">
                  <dt>Reason</dt>
                  <dd>{request.reason}</dd>
                </div>
                <div className="marketplace-dl-row">
                  <dt>Refund status</dt>
                  <dd>{request.refundStatus}</dd>
                </div>
                <div className="marketplace-dl-row">
                  <dt>Requested</dt>
                  <dd>{new Date(request.createdAt).toLocaleString("en-IN")}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <StatePanel
            title="Refund simulation only"
            description="No real payment is involved. Refund status is recorded by the local return workflow and does not represent a bank settlement."
            tone="info"
          />
        </aside>
      </div>
    </main>
  );
}
