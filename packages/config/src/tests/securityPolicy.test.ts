import { describe, expect, it } from "vitest";

import {
  aiTimeoutPolicy,
  dataRetentionPolicies,
  mediaValidationPolicy,
  operatorRolePolicies,
  recoveryPolicy,
  routeLimitPolicies,
  routeLimitPolicyCopy,
  selectRouteLimitPolicy
} from "../securityPolicy.js";

describe("security policy fixtures", () => {
  it("fails sensitive route groups closed when the limiter store fails", () => {
    expect(routeLimitPolicies.authSensitive.limiterFailureMode).toBe("failClosed");
    expect(routeLimitPolicies.commerceMutation.limiterFailureMode).toBe("failClosed");
    expect(routeLimitPolicies.ai.limiterFailureMode).toBe("failClosed");
  });

  it("keeps public reads bounded but locally degradable", () => {
    expect(routeLimitPolicies.publicRead.limiterFailureMode).toBe("localFallback");
    expect(routeLimitPolicies.publicRead.bodyBytes).toBeLessThanOrEqual(16_384);
  });

  it("maps route shapes to the expected policy groups", () => {
    expect(selectRouteLimitPolicy("GET", "/v1/products/seed").group).toBe("publicRead");
    expect(selectRouteLimitPolicy("POST", "/v1/checkout/confirm").group).toBe("commerceMutation");
    expect(selectRouteLimitPolicy("POST", "/v1/search/intent").group).toBe("ai");
  });

  it("captures privacy, role, media, AI, and recovery gates", () => {
    expect(dataRetentionPolicies.behavior.defaultRetentionDays).toBe(180);
    expect(operatorRolePolicies.deadLetterReplayer.auditRequired).toBe(true);
    expect(mediaValidationPolicy.quarantineRequired).toBe(true);
    expect(mediaValidationPolicy.allowedMimeTypes).not.toContain("image/svg+xml");
    expect(aiTimeoutPolicy.fallback).toBe("deterministic-baseline");
    expect(recoveryPolicy.rpoHours).toBe(24);
    expect(recoveryPolicy.deadLetterReplayAuditRequired).toBe(true);
  });

  it("keeps operator-facing policy copy concrete and dash-free", () => {
    const copy = [
      routeLimitPolicyCopy.commerceMutation.summary,
      routeLimitPolicyCopy.upload.operatorAction,
      dataRetentionPolicies.behavior.summary,
      mediaValidationPolicy.publicationCopy,
      recoveryPolicy.operatorCopy,
      aiTimeoutPolicy.fallbackCopy
    ].join(" ");

    expect(copy).toContain("stock");
    expect(copy).toContain("uploaded media");
    expect(copy).not.toMatch(/[\u2014\u2013]/u);
  });
});
