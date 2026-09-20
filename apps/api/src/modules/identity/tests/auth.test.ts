import { parseAppEnvironment } from "@veyra/config";
import { describe, expect, it } from "vitest";

import { checkOrigin, corsHeaders, sessionPolicy, trustedOrigins } from "../auth.js";
import { resetLocalRateLimitsForTests } from "../../../platform/http.js";
import { app } from "../../../index.js";

describe("auth and browser protection", () => {
  it("uses the approved session and recovery-token policy", () => {
    expect(sessionPolicy.expiresInSeconds).toBe(7 * 24 * 60 * 60);
    expect(sessionPolicy.rollingRefreshSeconds).toBe(24 * 60 * 60);
    expect(sessionPolicy.verificationTokenTtlSeconds).toBe(15 * 60);
    expect(sessionPolicy.cookie).toEqual({ httpOnly: true, secure: true, sameSite: "lax" });
  });

  it("allows only configured first-party origins", () => {
    const environment = parseAppEnvironment({
      NODE_ENV: "development",
      VEYRA_APP_ORIGIN: "https://veyra.example",
      VEYRA_API_ORIGIN: "https://api.veyra.example"
    });

    expect(trustedOrigins(environment)).toEqual(["https://veyra.example", "https://api.veyra.example"]);
    expect(checkOrigin("https://veyra.example", environment).allowed).toBe(true);
    expect(checkOrigin("https://evil.example", environment)).toEqual({ allowed: false, reason: "untrusted_origin" });
    expect(corsHeaders("https://veyra.example", environment).get("access-control-allow-origin")).toBe(
      "https://veyra.example"
    );
  });

  it("emits credentialed CORS only for trusted browser origins", async () => {
    const preflight = await app.request("/v1/search", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3000", "access-control-request-method": "GET" }
    });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(preflight.headers.get("access-control-allow-credentials")).toBe("true");

    const rejected = await app.request("/v1/search", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" }
    });
    expect(rejected.status).toBe(403);
  });

  it("mounts Better Auth and resolves a verified session principal", async () => {
    const forgedPrincipal = await app.request("/v1/orders", {
      headers: { "x-veyra-shopper-id": "forged-shopper" }
    });
    expect(forgedPrincipal.status).toBe(403);

    const email = `${crypto.randomUUID()}@example.test`;
    const response = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Shopper", email, password: "test-password" })
    });
    const sessionCookie = response.headers.get("set-cookie");
    expect(response.status).toBe(200);
    expect(sessionCookie).toContain("better-auth.session_token=");

    const orders = await app.request("/v1/orders", { headers: { cookie: sessionCookie! } });
    expect(orders.status).toBe(200);

    const signedOut = await app.request("/api/auth/sign-out", {
      method: "POST",
      headers: { origin: "http://localhost:3000", cookie: sessionCookie! }
    });
    expect(signedOut.status).toBe(200);
    expect((await app.request("/v1/orders", { headers: { cookie: sessionCookie! } })).status).toBe(403);

    const signedIn = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ email, password: "test-password" })
    });
    expect(signedIn.status).toBe(200);
  });

  it("rejects mutating requests without trusted origin and matching csrf token", async () => {
    resetLocalRateLimitsForTests();

    const blocked = await app.request("/missing", {
      method: "POST",
      headers: { origin: "https://evil.example" }
    });

    expect(blocked.status).toBe(403);

    const allowedProtection = await app.request("/missing", {
      method: "POST",
      headers: {
        origin: "http://localhost:8787",
        cookie: "veyra_csrf=token",
        "x-csrf-token": "token"
      }
    });

    expect(allowedProtection.status).toBe(404);
  });
});
