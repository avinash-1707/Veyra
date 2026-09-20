import { z } from "zod";

const runtimeEnvironmentSchema = z.enum(["development", "test", "production"]);

const baseEnvironmentSchema = z.object({
  NODE_ENV: runtimeEnvironmentSchema.default("development"),
  VEYRA_APP_ORIGIN: z.url().optional(),
  VEYRA_API_ORIGIN: z.url().optional(),
  DATABASE_URL: z.url().optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  QDRANT_URL: z.url().optional(),
  QDRANT_API_KEY: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional()
});

const productionEnvironmentSchema = baseEnvironmentSchema.extend({
  NODE_ENV: z.literal("production"),
  VEYRA_APP_ORIGIN: z.url(),
  VEYRA_API_ORIGIN: z.url(),
  DATABASE_URL: z.url(),
  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  QDRANT_URL: z.url(),
  QDRANT_API_KEY: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1)
});

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;
export type AppEnvironment = z.infer<typeof baseEnvironmentSchema>;

export function parseAppEnvironment(input: NodeJS.ProcessEnv): AppEnvironment {
  const parsedBase = baseEnvironmentSchema.parse(input);

  if (parsedBase.NODE_ENV === "production") {
    return productionEnvironmentSchema.parse(input);
  }

  return parsedBase;
}
