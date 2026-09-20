import { parseAppEnvironment } from "@veyra/config";
import {
  addCartItemCommandSchema,
  cartResponseSchema,
  categoryListResponseSchema,
  checkoutConfirmCommandSchema,
  checkoutQuoteCommandSchema,
  checkoutQuoteResponseSchema,
  compareResponseSchema,
  deliveryEstimateResponseSchema,
  editOrderDeliveryCommandSchema,
  evaluationResponseSchema,
  indianAddressSchema,
  orderListResponseSchema,
  orderResponseSchema,
  productDetailResponseSchema,
  productSeedListResponseSchema,
  searchFiltersSchema,
  searchListResponseSchema,
  searchSortSchema,
  suggestionsResponseSchema,
  updateCartItemCommandSchema
} from "@veyra/contracts";
import { Hono } from "hono";

import { addCartItem, moveCartItem, readCart, removeCartItem, updateCartItem } from "./modules/cart/cart.js";
import { catalogSeedProducts } from "./modules/catalog/catalogSeed.js";
import { compareProducts, estimateDelivery, getEvaluation, getProduct, getProductByOffer, listCategories, searchProducts, searchSuggestions } from "./modules/discovery/discovery.js";
import { advanceFulfillment, cancelOrder, confirmCheckout, createCheckoutQuote, editOrderDelivery, getOrder, listOrders } from "./modules/orders/orders.js";
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

app.get("/v1/compare", (context) => {
  const slugs = (context.req.query("products") ?? "").split(",");
  const comparison = compareProducts(slugs);
  if (comparison.products.length === 0 || slugs.filter((slug) => slug.trim().length > 0).length > 3) {
    return fail(context, 400, "validation_error", "Compare one to three valid products.");
  }
  const response = compareResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: comparison
  });
  return context.json(response);
});

app.get("/v1/products/:slug/evaluation", (context) => {
  const evaluation = getEvaluation(context.req.param("slug"));
  if (evaluation === undefined) {
    return fail(context, 404, "not_found", "Product was not found.");
  }
  const response = evaluationResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: evaluation
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

app.get("/v1/cart", (context) => {
  const response = cartResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: readCart(cartIdFromRequest(context.req.header("x-veyra-cart-id")))
  });
  return context.json(response);
});

app.post("/v1/cart/items", async (context) => {
  const payload = addCartItemCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Choose a valid offer, variant, and quantity.");
  return cartMutationResponse(context, addCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), payload.data, context.req.header("idempotency-key")));
});

app.patch("/v1/cart/items/:lineId", async (context) => {
  const payload = updateCartItemCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a supported cart quantity.");
  return cartMutationResponse(context, updateCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), payload.data, context.req.header("idempotency-key")));
});

app.post("/v1/cart/items/:lineId/save-for-later", (context) => {
  return cartMutationResponse(context, moveCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), "saved_for_later", context.req.header("idempotency-key")));
});

app.post("/v1/cart/items/:lineId/restore", (context) => {
  return cartMutationResponse(context, moveCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), "cart", context.req.header("idempotency-key")));
});

app.delete("/v1/cart/items/:lineId", (context) => {
  return cartMutationResponse(context, removeCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), context.req.header("idempotency-key")));
});

app.post("/v1/checkout/quote", async (context) => {
  const payload = checkoutQuoteCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a valid checkout address, delivery speed, and mock payment method.");
  const result = createCheckoutQuote(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), payload.data);
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = checkoutQuoteResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/checkout/confirm", async (context) => {
  const payload = checkoutConfirmCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Confirm an unexpired checkout quote.");
  const result = confirmCheckout(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), payload.data, context.req.header("idempotency-key"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.get("/v1/orders", (context) => {
  const response = orderListResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: listOrders(shopperIdFromRequest(context.req.header("x-veyra-shopper-id"))) });
  return context.json(response);
});

app.get("/v1/orders/:orderId", (context) => {
  const result = getOrder(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/orders/:orderId/cancel", (context) => {
  const result = cancelOrder(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.patch("/v1/orders/:orderId/delivery", async (context) => {
  const payload = editOrderDeliveryCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a complete delivery address and supported delivery speed.");
  const result = editOrderDelivery(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"), payload.data);
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/orders/:orderId/advance-fulfillment", (context) => {
  const result = advanceFulfillment(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
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

function cartIdFromRequest(value: string | undefined): string {
  return value === undefined || value.trim().length === 0 ? "local-guest-cart" : value.trim().slice(0, 120);
}

function shopperIdFromRequest(value: string | undefined): string {
  return value === undefined || value.trim().length === 0 ? "local-shopper" : value.trim().slice(0, 120);
}

function cartMutationResponse(context: Parameters<typeof fail>[0], result: ReturnType<typeof addCartItem>) {
  if (result.status === "ok") {
    const response = cartResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.cart });
    return context.json(response);
  }
  if (result.status === "conflict") return fail(context, 409, "idempotency_conflict", result.message);
  if (result.status === "policy_conflict") return fail(context, 409, "policy_conflict", result.message);
  return fail(context, 404, "not_found", result.message);
}

function commandFailureResponse(context: Parameters<typeof fail>[0], result: { status: string; message: string }) {
  if (result.status === "conflict") return fail(context, 409, "idempotency_conflict", result.message);
  if (result.status === "policy_conflict") return fail(context, 409, "policy_conflict", result.message);
  if (result.status === "validation") return fail(context, 400, "validation_error", result.message);
  return fail(context, 404, "not_found", result.message);
}

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
