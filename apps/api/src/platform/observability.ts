const sensitiveKeyPattern = /(password|secret|token|authorization|cookie|card|cvv|pass)/iu;

export type LogValue = string | number | boolean | null | LogValue[] | { readonly [key: string]: LogValue };
export type LogFields = Record<string, LogValue>;

export type AuditEvent = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string;
  occurredAt: string;
  metadata: LogFields;
};

export function redactLogFields(fields: LogFields): LogFields {
  const redacted: LogFields = {};

  for (const [key, value] of Object.entries(fields)) {
    if (sensitiveKeyPattern.test(key)) {
      redacted[key] = "[REDACTED]";
      continue;
    }

    if (Array.isArray(value)) {
      redacted[key] = value.map((item) => redactLogValue(item));
      continue;
    }

    if (value !== null && typeof value === "object") {
      redacted[key] = redactLogFields(value);
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
}

function redactLogValue(value: LogValue): LogValue {
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item));
  }

  if (value !== null && typeof value === "object") {
    return redactLogFields(value);
  }

  return value;
}

export function createAuditEvent(
  input: Omit<AuditEvent, "occurredAt" | "metadata"> & { metadata?: LogFields }
): AuditEvent {
  return {
    ...input,
    occurredAt: new Date().toISOString(),
    metadata: redactLogFields(input.metadata ?? {})
  };
}
