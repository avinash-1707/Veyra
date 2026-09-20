import type { OutboxEvent } from "@veyra/contracts";

export type ScheduledOutboxStore = {
  pending(): readonly OutboxEvent[];
  drain(
    consumer: (event: OutboxEvent) => Promise<void>,
    maxAttempts: number
  ): Promise<{ processed: number; deadLettered: number }>;
};

export type ScheduledOutboxResult = {
  attempted: number;
  processed: number;
  deadLettered: number;
};

export async function runScheduledOutboxDrain(store: ScheduledOutboxStore): Promise<ScheduledOutboxResult> {
  const attempted = store.pending().length;
  const result = await store.drain(async () => undefined, 3);

  return {
    attempted,
    processed: result.processed,
    deadLettered: result.deadLettered
  };
}
