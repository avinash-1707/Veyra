import {
  createReturnCommandSchema,
  returnEligibilityResponseSchema,
  returnListResponseSchema,
  returnResponseSchema,
  reviewResponseSchema,
  reviewSubmissionSchema,
  supportConfirmationResponseSchema,
  supportProposalCommandSchema,
  supportProposalResponseSchema
} from "@veyra/contracts";
import { Hono } from "hono";

import { fail, type AppBindings } from "../../platform/http.js";
import { paginateByCursor, parsePagination } from "../../platform/pagination.js";
import { commandFailureResponse, shopperIdFromRequest } from "../../platform/routeHelpers.js";
import {
  confirmSupportProposal,
  createReturn,
  createSupportProposal,
  getReturn,
  getReturnEligibility,
  listReturns,
  submitReview
} from "./service.js";

export const returnRoutes = new Hono<AppBindings>();

returnRoutes.get("/v1/orders/:orderId/returns", async (context) => {
  const requests = await listReturns(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("orderId")
  );
  return context.json(
    returnListResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: paginateByCursor(
        requests,
        parsePagination({ cursor: context.req.query("cursor"), limit: context.req.query("limit") }),
        (request) => request.id
      )
    })
  );
});

returnRoutes.get("/v1/orders/:orderId/items/:lineId/return-eligibility", async (context) => {
  const result = await getReturnEligibility(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("orderId"),
    context.req.param("lineId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    returnEligibilityResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

returnRoutes.post("/v1/returns", async (context) => {
  const payload = createReturnCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success)
    return fail(context, 400, "validation_error", "Choose a valid delivered item and return reason.");
  const result = await createReturn(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    payload.data,
    context.req.header("idempotency-key"),
    context.get("requestId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    returnResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

returnRoutes.get("/v1/returns/:returnId", async (context) => {
  const result = await getReturn(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("returnId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    returnResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

returnRoutes.post("/v1/reviews", async (context) => {
  const payload = reviewSubmissionSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success)
    return fail(context, 400, "validation_error", "Enter a rating, title, and review within the supported limits.");
  const result = await submitReview(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    payload.data,
    context.req.header("idempotency-key")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    reviewResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

returnRoutes.post("/v1/support/proposals", async (context) => {
  const payload = supportProposalCommandSchema.safeParse(await context.req.json<unknown>());
  if (!payload.success)
    return fail(context, 400, "validation_error", "Enter a supported help action and its required context.");
  const result = await createSupportProposal(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    payload.data
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    supportProposalResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.data })
  );
});

returnRoutes.post("/v1/support/proposals/:proposalId/confirm", async (context) => {
  const result = await confirmSupportProposal(
    shopperIdFromRequest(context.req.header("x-veyra-shopper-id")),
    context.req.param("proposalId"),
    context.req.header("idempotency-key"),
    context.get("requestId")
  );
  if (result.status !== "ok") return commandFailureResponse(context, result);
  return context.json(
    supportConfirmationResponseSchema.parse({
      apiVersion: "v1",
      requestId: context.get("requestId"),
      data: result.data
    })
  );
});
