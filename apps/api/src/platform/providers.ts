import type { AppEnvironment } from "@veyra/config";
import nodemailer from "nodemailer";

export type ProviderStatus = "configured" | "not_configured";

export type ProviderDescriptor = {
  name: "postgres" | "redis" | "qdrant" | "email";
  status: ProviderStatus;
  purpose: string;
};

export function providerDescriptors(environment: AppEnvironment): readonly ProviderDescriptor[] {
  return [
    {
      name: "postgres",
      status: environment.DATABASE_URL === undefined ? "not_configured" : "configured",
      purpose: "authoritative commerce and identity data"
    },
    {
      name: "redis",
      status:
        environment.UPSTASH_REDIS_REST_URL === undefined || environment.UPSTASH_REDIS_REST_TOKEN === undefined
          ? "not_configured"
          : "configured",
      purpose: "ephemeral rate limits, idempotency, and cache coordination"
    },
    {
      name: "qdrant",
      status:
        environment.QDRANT_URL === undefined || environment.QDRANT_API_KEY === undefined
          ? "not_configured"
          : "configured",
      purpose: "rebuildable semantic retrieval indexes"
    },
    {
      name: "email",
      status:
        environment.SMTP_HOST === undefined ||
        environment.SMTP_USER === undefined ||
        environment.SMTP_PASS === undefined
          ? "not_configured"
          : "configured",
      purpose: "verification and password recovery messages"
    }
  ];
}

export function createEmailTransport(environment: AppEnvironment) {
  if (
    environment.SMTP_HOST === undefined ||
    environment.SMTP_USER === undefined ||
    environment.SMTP_PASS === undefined
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: environment.SMTP_HOST,
    auth: {
      user: environment.SMTP_USER,
      pass: environment.SMTP_PASS
    }
  });
}
