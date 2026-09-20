import { parseAppEnvironment } from "@veyra/config";
import { Hono } from "hono";

import {
  browserProtectionMiddleware,
  fail,
  ok,
  policyMiddleware,
  requestIdMiddleware,
  securityHeadersMiddleware,
  type AppBindings
} from "./platform/http.js";
import { registerRoutes } from "./routes.js";

export const appEnvironment = parseAppEnvironment(process.env);
export const app = new Hono<AppBindings>();

app.use("*", requestIdMiddleware);
app.use("*", securityHeadersMiddleware);
app.use("*", policyMiddleware);
app.use("*", browserProtectionMiddleware(appEnvironment));

app.onError((_error, context) => fail(context, 500, "internal_error", "Unexpected server error"));
app.notFound((context) => fail(context, 404, "not_found", "Route not found"));
app.get("/health", (context) => ok(context, { status: "ok" }));

registerRoutes(app);

export default app;
