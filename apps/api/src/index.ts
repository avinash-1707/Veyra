import { parseAppEnvironment } from "@veyra/config";
import {
  categoryListResponseSchema,
  deliveryEstimateResponseSchema,
  indianAddressSchema,
  productDetailResponseSchema,
  productSeedListResponseSchema,
  searchFiltersSchema,
  searchListResponseSchema,
  searchSortSchema,
  suggestionsResponseSchema
} from "@veyra/contracts";
import { Hono } from "hono";

import { catalogSeedProducts } from "./modules/catalog/catalogSeed.js";
import { estimateDelivery, getProduct, getProductByOffer, listCategories, searchProducts, searchSuggestions } from "./modules/discovery/discovery.js";
import { browserProtectionMiddleware, fail, ok, policyMiddleware, requestIdMiddleware, securityHeadersMiddleware, type AppBindings } from "./platform/http.js";

export const appEnvironment = parseAppEnvironment(process.env);

export const app = new Hono<AppBindings>();

app.use("*", requestIdMiddleware);
app.use("*", securityHeadersMiddleware);
app.use("*", policyMiddleware);
app.use("*", browserProtectionMiddleware(appEnvironment));

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

app.get("/v1/categories", (context) => {
  const response = categoryListResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: listCategories()
  });
  return context.json(response);
});

app.get("/v1/search", (context) => {
  const query = context.req.query("q") ?? "";
  const filters = searchFiltersSchema.safeParse({
    category: context.req.query("category"),
    brand: context.req.query("brand"),
    minPriceMinor: parseOptionalInteger(context.req.query("minPriceMinor")),
    maxPriceMinor: parseOptionalInteger(context.req.query("maxPriceMinor")),
    minRating: parseOptionalNumber(context.req.query("minRating")),
    availability: context.req.query("availability")
  });
  const sort = searchSortSchema.safeParse(context.req.query("sort") ?? "relevance");

  if (!filters.success || !sort.success || query.length > 200) {
    return fail(context, 400, "validation_error", "Use supported search filters and sort values.");
  }

  const response = searchListResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: searchProducts(query, filters.data, sort.data)
  });
  return context.json(response);
});

app.get("/v1/search/suggestions", (context) => {
  const query = context.req.query("q") ?? "";
  if (query.length > 200) {
    return fail(context, 400, "validation_error", "Search suggestions must use a shorter query.");
  }
  const response = suggestionsResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: searchSuggestions(query)
  });
  return context.json(response);
});

app.get("/v1/products/:slug", (context) => {
  const variantId = context.req.query("variant");
  const offerId = context.req.query("offer");
  const product = getProduct(context.req.param("slug"), {
    ...(variantId === undefined ? {} : { variantId }),
    ...(offerId === undefined ? {} : { offerId })
  });
  if (product === undefined) {
    return fail(context, 404, "not_found", "Product or selected offer was not found.");
  }
  const response = productDetailResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: product
  });
  return context.json(response);
});

app.post("/v1/delivery/estimate", async (context) => {
  const payload = indianAddressSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) {
    return fail(context, 400, "validation_error", "Enter a complete Indian delivery address.");
  }
  const offerId = context.req.query("offer");
  const product = offerId === undefined ? undefined : getProductByOffer(offerId);
  if (product === undefined) {
    return fail(context, 404, "not_found", "Offer not found.");
  }

  const response = deliveryEstimateResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: estimateDelivery(payload.data, product.selectedOffer)
  });
  return context.json(response);
});

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^-?\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(value)) return Number.NaN;
  return Number(value);
}

export default app;
