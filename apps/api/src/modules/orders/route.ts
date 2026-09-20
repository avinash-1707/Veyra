import {
  checkoutConfirmCommandSchema,
  checkoutQuoteCommandSchema,
  checkoutQuoteResponseSchema,
  editOrderDeliveryCommandSchema,
  orderListResponseSchema,
  orderResponseSchema
} from "@veyra/contracts";
import { Hono } from "hono";

import { fail, type AppBindings } from "../../platform/http.js";
import { paginateByCursor, parsePagination } from "../../platform/pagination.js";
import { commandFailureResponse, requireVerifiedShopper } from "../../platform/routeHelpers.js";
import {
  advanceFulfillment,
  cancelOrder,
  confirmCheckout,
  createCheckoutQuote,
  editOrderDelivery,
  getOrder,
  listOrders
} from "./service.js";

export const orderRoutes = new Hono<AppBindings>();

orderRoutes.post("/v1/checkout/quote", async (context) => {
  const shopper = await requireVerifiedShopper(context);
  if (!shopper.authenticated) return shopper.response;
  const payload = checkoutQuoteCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success)
    return fail(
      context,
      400,
      "validation_error",
      "Enter a valid checkout address, delivery speed, and mock payment method."
    );
  const result = await createCheckoutQuote(shopper.shopperId, payload.data);
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    checkoutQuoteResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.post("/v1/checkout/confirm", async (context) => {
  const shopper = await requireVerifiedShopper(context);
  if (!shopper.authenticated) return shopper.response;
  const payload = checkoutConfirmCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Confirm an unexpired checkout quote.");
  const result = await confirmCheckout(
    shopper.shopperId,
    payload.data,
    context.req.header("idempotency-key"),
    context.get("requestId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.get("/v1/orders", async (context) => {
  const shopper = await requireVerifiedShopper(context);
  if (!shopper.authenticated) return shopper.response;
  const orders = await listOrders(shopper.shopperId);
  return context.json(
    orderListResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: paginateByCursor(
        orders,
        parsePagination({ cursor: context.req.query("cursor"), limit: context.req.query("limit") }),
        (order) => order.id
      )
    })
  );
});

orderRoutes.get("/v1/orders/:orderId", async (context) => {
  const shopper = await requireVerifiedShopper(context);
  if (!shopper.authenticated) return shopper.response;
  const result = await getOrder(shopper.shopperId, context.req.param("orderId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.post("/v1/orders/:orderId/cancel", async (context) => {
  const shopper = await requireVerifiedShopper(context);
  if (!shopper.authenticated) return shopper.response;
  const result = await cancelOrder(shopper.shopperId, context.req.param("orderId"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.patch("/v1/orders/:orderId/delivery", async (context) => {
  const shopper = await requireVerifiedShopper(context);
  if (!shopper.authenticated) return shopper.response;
  const payload = editOrderDeliveryCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success)
    return fail(context, 400, "validation_error", "Enter a complete delivery address and supported delivery speed.");
  const result = await editOrderDelivery(shopper.shopperId, context.req.param("orderId"), payload.data);
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.post("/v1/orders/:orderId/advance-fulfillment", async (context) => {
  const shopper = await requireVerifiedShopper(context);
  if (!shopper.authenticated) return shopper.response;
  const result = await advanceFulfillment(shopper.shopperId, context.req.param("orderId"), context.get("requestId"));
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});
