import { addCartItemCommandSchema, cartResponseSchema, updateCartItemCommandSchema } from "@veyra/contracts";
import { Hono } from "hono";

import { cartIdFromRequest, cartMutationResponse } from "../../platform/routeHelpers.js";
import { fail, type AppBindings } from "../../platform/http.js";
import { addCartItem, moveCartItem, readCart, removeCartItem, updateCartItem } from "./service.js";

export const cartRoutes = new Hono<AppBindings>();

cartRoutes.get("/v1/cart", async (context) =>
  context.json(
    cartResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: await readCart(cartIdFromRequest(context.req.header("x-veyra-cart-id")))
    })
  )
);

cartRoutes.post("/v1/cart/items", async (context) => {
  const payload = addCartItemCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Choose a valid offer, variant, and quantity.");
  return cartMutationResponse(
    context,
    await addCartItem(
      cartIdFromRequest(context.req.header("x-veyra-cart-id")),
      payload.data,
      context.req.header("idempotency-key")
    )
  );
});

cartRoutes.patch("/v1/cart/items/:lineId", async (context) => {
  const payload = updateCartItemCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success) return fail(context, 400, "validation_error", "Enter a supported cart quantity.");
  return cartMutationResponse(
    context,
    await updateCartItem(
      cartIdFromRequest(context.req.header("x-veyra-cart-id")),
      context.req.param("lineId"),
      payload.data,
      context.req.header("idempotency-key")
    )
  );
});

cartRoutes.post("/v1/cart/items/:lineId/save-for-later", async (context) =>
  cartMutationResponse(
    context,
    moveCartItem(
      cartIdFromRequest(context.req.header("x-veyra-cart-id")),
      context.req.param("lineId"),
      "saved_for_later",
      context.req.header("idempotency-key")
    )
  )
);
cartRoutes.post("/v1/cart/items/:lineId/restore", async (context) =>
  cartMutationResponse(
    context,
    moveCartItem(
      cartIdFromRequest(context.req.header("x-veyra-cart-id")),
      context.req.param("lineId"),
      "cart",
      context.req.header("idempotency-key")
    )
  )
);
cartRoutes.delete("/v1/cart/items/:lineId", async (context) =>
  cartMutationResponse(
    context,
    removeCartItem(
      cartIdFromRequest(context.req.header("x-veyra-cart-id")),
      context.req.param("lineId"),
      context.req.header("idempotency-key")
    )
  )
);
