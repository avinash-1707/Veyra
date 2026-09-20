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
        origin: "http://localhost:3001",
        cookie: "veyra_csrf=token",
        "x-csrf-token": "token"
      }
    });

    expect(allowedProtection.status).toBe(404);
  });
});
