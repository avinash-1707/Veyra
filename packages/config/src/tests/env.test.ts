import { describe, expect, it } from "vitest";

import { parseAppEnvironment } from "../env.js";

describe("parseAppEnvironment", () => {
  it("requires provider configuration in production", () => {
    expect(() => parseAppEnvironment({ NODE_ENV: "production" })).toThrow();
  });

  it("accepts complete production provider configuration", () => {
    const environment = parseAppEnvironment({
      NODE_ENV: "production",
      VEYRA_APP_ORIGIN: "https://veyra.example",
      VEYRA_API_ORIGIN: "https://api.veyra.example",
      DATABASE_URL: "https://database.example",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
      QDRANT_URL: "https://qdrant.example",
      QDRANT_API_KEY: "qdrant-key",
      BETTER_AUTH_SECRET: "12345678901234567890123456789012",
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
      SMTP_HOST: "smtp.example",
      SMTP_USER: "smtp-user",
      SMTP_PASS: "smtp-pass"
    });

    expect(environment.NODE_ENV).toBe("production");
  });

  it("allows local development without deployed provider configuration", () => {
    expect(parseAppEnvironment({ NODE_ENV: "development" }).NODE_ENV).toBe("development");
  });
});
