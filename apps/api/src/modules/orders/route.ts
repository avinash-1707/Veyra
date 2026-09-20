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
import { commandFailureResponse, shopperIdFromRequest } from "../../platform/routeHelpers.js";
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
  const payload = checkoutQuoteCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success)
    return fail(
      context,
      400,
      "validation_error",
      "Enter a valid checkout address, delivery speed, and mock payment method."
    );
  const result = await createCheckoutQuote(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    payload.data
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    checkoutQuoteResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.post("/v1/checkout/confirm", async (context) => {
  const payload = checkoutConfirmCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Confirm an unexpired checkout quote.");
  const result = await confirmCheckout(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
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
  const orders = await listOrders(shopperIdFromRequest(context.req.header("x-veyra-shopper-id")));
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
  const result = await getOrder(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("orderId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.post("/v1/orders/:orderId/cancel", async (context) => {
  const result = await cancelOrder(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("orderId"),
    context.get("requestId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.patch("/v1/orders/:orderId/delivery", async (context) => {
  const payload = editOrderDeliveryCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success)
    return fail(context, 400, "validation_error", "Enter a complete delivery address and supported delivery speed.");
  const result = await editOrderDelivery(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("orderId"),
    payload.data
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

orderRoutes.post("/v1/orders/:orderId/advance-fulfillment", async (context) => {
  const result = await advanceFulfillment(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("orderId"),
    context.get("requestId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    orderResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});
