import {
  categoryListResponseSchema,
  compareResponseSchema,
  deliveryEstimateResponseSchema,
  evaluationResponseSchema,
  indianAddressSchema,
  productDetailResponseSchema,
  productSeedListResponseSchema,
  searchFiltersSchema,
  searchListResponseSchema,
  searchSortSchema,
  suggestionsResponseSchema
} from "@veyra/contracts";
import { Hono } from "hono";

import { fail, type AppBindings } from "../../platform/http.js";
import { parseOptionalInteger, parseOptionalNumber } from "../../platform/routeHelpers.js";
import { parsePagination } from "../../platform/pagination.js";
import {
  compareProducts,
  estimateDelivery,
  getEvaluation,
  getProduct,
  getProductByOffer,
  listCategories,
  listProductSeeds,
  searchProducts,
  searchSuggestions
} from "./service.js";

export const discoveryRoutes = new Hono<AppBindings>();

discoveryRoutes.get("/v1/products/seed", async (context) =>
  context.json(
    productSeedListResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: await listProductSeeds()
    })
  )
);
discoveryRoutes.get("/v1/categories", async (context) =>
  context.json(
    categoryListResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: await listCategories()
    })
  )
);

discoveryRoutes.get("/v1/search", async (context) => {
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
  if (!filters.success || !sort.success || query.length > 200)
    return fail(context, 400, "validation_error", "Use supported search filters and sort values.");
  return context.json(
    searchListResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: await searchProducts(
        query,
        filters.data,
        sort.data,
        parsePagination({ cursor: context.req.query("cursor"), limit: context.req.query("limit") })
      )
    })
  );
});

discoveryRoutes.get("/v1/search/suggestions", async (context) => {
  const query = context.req.query("q") ?? "";
  if (query.length > 200) return fail(context, 400, "validation_error", "Search suggestions must use a shorter query.");
  return context.json(
    suggestionsResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: await searchSuggestions(query)
    })
  );
});

discoveryRoutes.get("/v1/compare", async (context) => {
  const slugs = (context.req.query("products") ?? "").split(",");
  const comparison = await compareProducts(slugs);
  if (comparison.products.length === 0 || slugs.filter((slug) => slug.trim().length > 0).length > 3)
    return fail(context, 400, "validation_error", "Compare one to three valid products.");
  return context.json(
    compareResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: comparison })
  );
});

discoveryRoutes.get("/v1/products/:slug/evaluation", async (context) => {
  const evaluation = await getEvaluation(context.req.param("slug"));
  if (evaluation === undefined) return fail(context, 404, "not_found", "Product was not found.");
  return context.json(
    evaluationResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: evaluation })
  );
});

discoveryRoutes.get("/v1/products/:slug", async (context) => {
  const variantId = context.req.query("variant");
  const offerId = context.req.query("offer");
  const product = await getProduct(context.req.param("slug"), {
    ...(variantId === undefined ? {} : { variantId }),
    ...(offerId === undefined ? {} : { offerId })
  });
  if (product === undefined) return fail(context, 404, "not_found", "Product or selected offer was not found.");
  return context.json(
    productDetailResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: product })
  );
});

discoveryRoutes.post("/v1/delivery/estimate", async (context) => {
  const payload = indianAddressSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a complete Indian delivery address.");
  const offerId = context.req.query("offer");
  const product = offerId === undefined ? undefined : await getProductByOffer(offerId);
  if (product === undefined) return fail(context, 404, "not_found", "Offer not found.");
  return context.json(
    deliveryEstimateResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: estimateDelivery(payload.data, product.selectedOffer)
    })
  );
});
