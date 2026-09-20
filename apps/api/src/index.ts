import { parseAppEnvironment } from "@veyra/config";
import {
  addCartItemCommandSchema,
  cartResponseSchema,
  comparisonGuidanceResponseSchema,
  categoryListResponseSchema,
  checkoutConfirmCommandSchema,
  checkoutQuoteCommandSchema,
  checkoutQuoteResponseSchema,
  compareResponseSchema,
  deliveryEstimateResponseSchema,
  editOrderDeliveryCommandSchema,
  evaluationResponseSchema,
  indianAddressSchema,
  intelligentSearchResponseSchema,
  orderListResponseSchema,
  orderResponseSchema,
  productDetailResponseSchema,
  returnEligibilityResponseSchema,
  returnListResponseSchema,
  returnResponseSchema,
  reviewGuidanceResponseSchema,
  reviewResponseSchema,
  reviewSubmissionSchema,
  supportConfirmationResponseSchema,
  supportProposalCommandSchema,
  supportProposalResponseSchema,
  createReturnCommandSchema,
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
import { comparisonGuidance, intelligentSearch, reviewGuidance } from "./modules/intelligence/intelligence.js";
import { advanceFulfillment, cancelOrder, confirmCheckout, createCheckoutQuote, editOrderDelivery, getOrder, listOrders } from "./modules/orders/orders.js";
import { confirmSupportProposal, createReturn, createSupportProposal, getReturn, getReturnEligibility, listReturns, submitReview } from "./modules/returns/returns.js";
import { browserProtectionMiddleware, fail, ok, policyMiddleware, requestIdMiddleware, securityHeadersMiddleware, type AppBindings } from "./platform/http.js";
import { paginateByCursor, parsePagination } from "./platform/pagination.js";

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

app.get("/v1/categories", async (context) => {
  const response = categoryListResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: await listCategories()
  });
  return context.json(response);
});

app.get("/v1/search", async (context) => {
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
    data: await searchProducts(query, filters.data, sort.data, parsePagination({ cursor: context.req.query("cursor"), limit: context.req.query("limit") }))
  });
  return context.json(response);
});

app.get("/v1/ai/comparison", (context) => {
  const guidance = comparisonGuidance((context.req.query("products") ?? "").split(",").filter(Boolean));
  if (guidance === undefined) return fail(context, 400, "validation_error", "Compare one to three valid products.");
  const response = comparisonGuidanceResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: guidance });
  return context.json(response);
});

app.get("/v1/ai/products/:slug/reviews", (context) => {
  const guidance = reviewGuidance(context.req.param("slug"));
  if (guidance === undefined) return fail(context, 404, "not_found", "Product was not found.");
  const response = reviewGuidanceResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: guidance });
  return context.json(response);
});

app.get("/v1/ai/search", async (context) => {
  const query = context.req.query("q") ?? "";
  if (query.trim().length === 0 || query.length > 200) return fail(context, 400, "validation_error", "Enter a shopping query of up to 200 characters.");
  const response = intelligentSearchResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: await intelligentSearch(query) });
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

app.get("/v1/cart", async (context) => {
  const response = cartResponseSchema.parse({
    apiVersion: "v1",
    requestId: context.get("requestId"),
    data: await readCart(cartIdFromRequest(context.req.header("x-veyra-cart-id")))
  });
  return context.json(response);
});

app.post("/v1/cart/items", async (context) => {
  const payload = addCartItemCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Choose a valid offer, variant, and quantity.");
  return cartMutationResponse(context, await addCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), payload.data, context.req.header("idempotency-key")));
});

app.patch("/v1/cart/items/:lineId", async (context) => {
  const payload = updateCartItemCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a supported cart quantity.");
  return cartMutationResponse(context, await updateCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), payload.data, context.req.header("idempotency-key")));
});

app.post("/v1/cart/items/:lineId/save-for-later", async (context) => {
  return cartMutationResponse(context, await moveCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), "saved_for_later", context.req.header("idempotency-key")));
});

app.post("/v1/cart/items/:lineId/restore", async (context) => {
  return cartMutationResponse(context, await moveCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), "cart", context.req.header("idempotency-key")));
});

app.delete("/v1/cart/items/:lineId", async (context) => {
  return cartMutationResponse(context, await removeCartItem(cartIdFromRequest(context.req.header("x-veyra-cart-id")), context.req.param("lineId"), context.req.header("idempotency-key")));
});

app.post("/v1/checkout/quote", async (context) => {
  const payload = checkoutQuoteCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a valid checkout address, delivery speed, and mock payment method.");
  const result = await createCheckoutQuote(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), payload.data);
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = checkoutQuoteResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/checkout/confirm", async (context) => {
  const payload = checkoutConfirmCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Confirm an unexpired checkout quote.");
  const result = await confirmCheckout(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), payload.data, context.req.header("idempotency-key"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.get("/v1/orders", async (context) => {
  const orders = await listOrders(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")));
  const response = orderListResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: paginateByCursor(orders, parsePagination({ cursor: context.req.query("cursor"), limit: context.req.query("limit") }), (order) => order.id) });
  return context.json(response);
});

app.get("/v1/orders/:orderId", async (context) => {
  const result = await getOrder(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/orders/:orderId/cancel", async (context) => {
  const result = await cancelOrder(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.patch("/v1/orders/:orderId/delivery", async (context) => {
  const payload = editOrderDeliveryCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a complete delivery address and supported delivery speed.");
  const result = await editOrderDelivery(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"), payload.data);
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/orders/:orderId/advance-fulfillment", async (context) => {
  const result = await advanceFulfillment(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.get("/v1/orders/:orderId/returns", async (context) => {
  const returns = await listReturns(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"));
  const response = returnListResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: paginateByCursor(returns, parsePagination({ cursor: context.req.query("cursor"), limit: context.req.query("limit") }), (request) => request.id) });
  return context.json(response);
});

app.get("/v1/orders/:orderId/items/:lineId/return-eligibility", async (context) => {
  const result = await getReturnEligibility(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("orderId"), context.req.param("lineId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = returnEligibilityResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/returns", async (context) => {
  const payload = createReturnCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Choose a valid delivered item and return reason.");
  const result = await createReturn(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), payload.data, context.req.header("idempotency-key"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = returnResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.get("/v1/returns/:returnId", async (context) => {
  const result = await getReturn(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("returnId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = returnResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/reviews", async (context) => {
  const payload = reviewSubmissionSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a rating, title, and review within the supported limits.");
  const result = await submitReview(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), payload.data, context.req.header("idempotency-key"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = reviewResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/support/proposals", async (context) => {
  const payload = supportProposalCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a supported help action and its required context.");
  const result = await createSupportProposal(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), payload.data);
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = supportProposalResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
  return context.json(response);
});

app.post("/v1/support/proposals/:proposalId/confirm", async (context) => {
  const result = await confirmSupportProposal(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")), context.req.param("proposalId"), context.req.header("idempotency-key"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  const response = supportConfirmationResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data });
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

function cartMutationResponse(context: Parameters<typeof fail>[0], result: Awaited<ReturnType<typeof addCartItem>>) {
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
