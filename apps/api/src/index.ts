import { parseAppEnvironment } from "@veyra/config";
import { productSeedListResponseSchema } from "@veyra/contracts";
import { Hono } from "hono";

import { catalogSeedProducts } from "./catalogSeed.js";
import { fail, ok, policyMiddleware, requestIdMiddleware, securityHeadersMiddleware, type AppBindings } from "./http.js";

export const appEnvironment = parseAppEnvironment(process.env);

export const app = new Hono<AppBindings>();

app.use("*", requestIdMiddleware);
app.use("*", securityHeadersMiddleware);
app.use("*", policyMiddleware);

app.onError((_error, context) => {
  return fail(context, 500, "internal_error", "Unexpected server error");
});

app.notFound((context) => {
  return fail(context, 404, "not_found", "Route not found");
});

app.get("/health", (context) => {
  return ok(context, { status: "ok" });
});

app.get("/v1/products/seed", (context) => {
  const response = productSeedListResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: catalogSeedProducts
  });

  return context.json(response);
});

export default app;
