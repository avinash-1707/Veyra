import {
  comparisonGuidanceResponseSchema,
  intelligentSearchResponseSchema,
  reviewGuidanceResponseSchema
} from "@veyra/contracts";
import { Hono } from "hono";

import { fail, type AppBindings } from "../../platform/http.js";
import { comparisonGuidance, intelligentSearch, reviewGuidance } from "./service.js";

export const intelligenceRoutes = new Hono<AppBindings>();

intelligenceRoutes.get("/v1/ai/comparison", async (context) => {
  const guidance = await comparisonGuidance((context.req.query("products") ?? "").split(",").filter(Boolean));
  if (guidance === undefined) return fail(context, 400, "validation_error", "Compare one to three valid products.");
  return context.json(
    comparisonGuidanceResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: guidance })
  );
});

intelligenceRoutes.get("/v1/ai/products/:slug/reviews", async (context) => {
  const guidance = await reviewGuidance(context.req.param("slug"));
  if (guidance === undefined) return fail(context, 404, "not_found", "Product was not found.");
  return context.json(
    reviewGuidanceResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: guidance })
  );
});

intelligenceRoutes.get("/v1/ai/search", async (context) => {
  const query = context.req.query("q") ?? "";
  if (query.trim().length === 0 || query.length > 200)
    return fail(context, 400, "validation_error", "Enter a shopping query of up to 200 characters.");
  return context.json(
    intelligentSearchResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: await intelligentSearch(query)
    })
  );
});
