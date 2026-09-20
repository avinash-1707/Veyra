import type { AppEnvironment } from "@veyra/config";
import { selectRouteLimitPolicy } from "@veyra/config";

import { checkOrigin } from "../modules/identity/auth.js";
import type { ApiErrorCode } from "@veyra/contracts";
import type { Context, MiddlewareHandler } from "hono";

export type AppBindings = {
  Variables: {
    requestId: string;
  };
};

type AppContext = Context<AppBindings>;

type LocalLimitBucket = {
  count: number;
  resetAtMs: number;
};

const localLimitBuckets = new Map<string, LocalLimitBucket>();

export const requestIdMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  const incomingRequestId = context.req.header("x-request-id");
  const requestId = incomingRequestId && incomingRequestId.length > 0 ? incomingRequestId : crypto.randomUUID();

  context.set("requestId", requestId);
  context.header("x-request-id", requestId);

  await next();
};

export const securityHeadersMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  context.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  context.header("referrer-policy", "no-referrer");
  context.header("x-content-type-options", "nosniff");
  context.header("x-frame-options", "DENY");

  await next();
};

function cookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }

  const prefix = `${name}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function isCookieAuthenticatedMutation(method: string, pathname: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method) && pathname !== "/v1/delivery/estimate";
}

export function browserProtectionMiddleware(environment: AppEnvironment): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    if (!isCookieAuthenticatedMutation(context.req.method, new URL(context.req.url).pathname)) {
      await next();
      return;
    }

    const originCheck = checkOrigin(context.req.header("origin") ?? null, environment);
    if (!originCheck.allowed) {
      return fail(context, 403, "forbidden", "Request origin is not allowed.");
    }

    const csrfHeader = context.req.header("x-csrf-token");
    const csrfCookie = cookieValue(context.req.header("cookie"), "veyra_csrf");
    if (csrfHeader === undefined || csrfCookie === undefined || csrfHeader !== csrfCookie) {
      return fail(context, 403, "forbidden", "Refresh the page and try again.");
    }

    await next();
  };
}

export const policyMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  const policy = selectRouteLimitPolicy(context.req.method, new URL(context.req.url).pathname);
  context.header("x-request-deadline-ms", policy.deadlineMs.toString());

  const contentLength = Number(context.req.header("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > policy.bodyBytes) {
    return fail(context, 413, "payload_too_large", "Reduce the request size and try again.");
  }

  const clientKey = context.req.header("cf-connecting-ip") ?? "local";
  const bucketKey = `${policy.group}:${clientKey}`;
  const now = Date.now();
  const currentBucket = localLimitBuckets.get(bucketKey);
  const bucket = currentBucket && currentBucket.resetAtMs > now
    ? currentBucket
    : { count: 0, resetAtMs: now + policy.windowSeconds * 1_000 };

  bucket.count += 1;
  localLimitBuckets.set(bucketKey, bucket);

  context.header("x-rate-limit-limit", policy.maxRequests.toString());
  context.header("x-rate-limit-remaining", Math.max(policy.maxRequests - bucket.count, 0).toString());
  context.header("x-rate-limit-reset", Math.ceil(bucket.resetAtMs / 1_000).toString());

  if (bucket.count > policy.maxRequests) {
    return fail(context, 429, "too_many_requests", "Too many requests. Wait and try again.");
  }

  await next();
};

export function resetLocalRateLimitsForTests(): void {
  localLimitBuckets.clear();
}

export function ok<Data>(context: AppContext, data: Data) {
  return context.json({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data
  });
}

export function fail(context: AppContext, status: 400 | 403 | 404 | 409 | 413 | 429 | 500, code: ApiErrorCode, message: string) {
  return context.json(
    {
      apiVersion: "v1",
      requestId: context.get("requestId"),
      error: { code, message }
    },
    status
  );
}
