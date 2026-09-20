import type { OutboxEvent, OutboxEventType } from "@veyra/contracts";

type PublishOutboxEventInput = {
  id: string;
  type: OutboxEventType;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  payload: Record<string, unknown>;
  occurredAt?: string;
};

export type OutboxConsumer = (event: OutboxEvent) => Promise<void>;

export class InMemoryOutbox {
  readonly #events: OutboxEvent[] = [];

  publish(input: PublishOutboxEventInput): OutboxEvent {
    const event: OutboxEvent = {
      id: input.id,
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      schemaVersion: 1,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      correlationId: input.correlationId,
      payload: input.payload,
      attemptCount: 0,
      state: "pending"
    };

    this.#events.push(event);
    return event;
  }

  pending(): readonly OutboxEvent[] {
    return this.#events.filter((event) => event.state === "pending");
  }

  async drain(consumer: OutboxConsumer, maxAttempts: number): Promise<{ processed: number; deadLettered: number }> {
    let processed = 0;
    let deadLettered = 0;

    for (const event of this.#events) {
      if (event.state !== "pending") {
        continue;
      }

      event.state = "processing";
      event.attemptCount += 1;

      try {
        await consumer(event);
        event.state = "processed";
        processed += 1;
      } catch {
        if (event.attemptCount >= maxAttempts) {
          event.state = "dead_letter";
          deadLettered += 1;
        } else {
          event.state = "pending";
        }
      }
    }

    return { processed, deadLettered };
  }
}
