import type { AppEnvironment } from "@veyra/config";
import { betterAuth } from "better-auth";

export const sessionPolicy = {
  expiresInSeconds: 7 * 24 * 60 * 60,
  rollingRefreshSeconds: 24 * 60 * 60,
  verificationTokenTtlSeconds: 15 * 60,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax"
  }
} as const;

export type OriginCheckResult =
  { allowed: true; origin: string } | { allowed: false; reason: "missing_origin" | "untrusted_origin" };

export function trustedOrigins(environment: AppEnvironment): readonly string[] {
  const configuredOrigins = [environment.VEYRA_APP_ORIGIN, environment.VEYRA_API_ORIGIN].filter(
    (origin) => origin !== undefined
  );

  if (configuredOrigins.length > 0 || environment.NODE_ENV === "production") {
    return configuredOrigins;
  }

  return ["http://localhost:3000", "http://localhost:3001"];
}

export function checkOrigin(origin: string | null, environment: AppEnvironment): OriginCheckResult {
  if (origin === null || origin.length === 0) {
    return { allowed: false, reason: "missing_origin" };
  }

  if (!trustedOrigins(environment).includes(origin)) {
    return { allowed: false, reason: "untrusted_origin" };
  }

  return { allowed: true, origin };
}

export function corsHeaders(origin: string, environment: AppEnvironment): Headers {
  const originCheck = checkOrigin(origin, environment);
  const headers = new Headers();

  if (!originCheck.allowed) {
    return headers;
  }

  headers.set("access-control-allow-origin", originCheck.origin);
  headers.set("access-control-allow-credentials", "true");
  headers.set("vary", "Origin");

  return headers;
}

export function createAuth(environment: AppEnvironment) {
  return betterAuth({
    secret: environment.BETTER_AUTH_SECRET ?? "local-development-secret-at-least-32-chars",
    baseURL: environment.VEYRA_API_ORIGIN ?? "http://localhost:3001",
    trustedOrigins: [...trustedOrigins(environment)],
    emailAndPassword: {
      enabled: true
    },
    socialProviders:
      environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: environment.GOOGLE_CLIENT_ID,
              clientSecret: environment.GOOGLE_CLIENT_SECRET
            }
          }
        : {},
    session: {
      expiresIn: sessionPolicy.expiresInSeconds,
      updateAge: sessionPolicy.rollingRefreshSeconds
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: sessionPolicy.cookie.httpOnly,
        secure: sessionPolicy.cookie.secure,
        sameSite: sessionPolicy.cookie.sameSite
      }
    }
  });
}
