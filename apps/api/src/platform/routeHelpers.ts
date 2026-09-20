import { cartResponseSchema } from "@veyra/contracts";

import { fail, type AppBindings } from "./http.js";

type AppContext = Parameters<typeof fail>[0];
type CartMutationResult =
  | { status: "ok"; cart: Awaited<ReturnType<typeof cartResponseSchema.parse>>["data"] }
  | { status: "conflict" | "not_found" | "policy_conflict"; message: string };
type CommandResult = { status: string; message: string };

export function cartIdFromRequest(value: string | undefined): string {
  return value === undefined || value.trim().length === 0 ? "local-guest-cart" : value.trim().slice(0, 120);
}

export function shopperIdFromRequest(value: string | undefined): string {
  return value === undefined || value.trim().length === 0 ? "local-shopper" : value.trim().slice(0, 120);
}

export async function cartMutationResponse(
  context: AppContext,
  pending: CartMutationResult | Promise<CartMutationResult>
): Promise<Response> {
  const result = await pending;
  if (result.status === "ok")
    return context.json(
      cartResponseSchema.parse({ apiVersion: "v1", requestId: context.get("requestId"), data: result.cart })
    );
  if (result.status === "conflict") return fail(context, 409, "idempotency_conflict", result.message);
  if (result.status === "policy_conflict") return fail(context, 409, "policy_conflict", result.message);
  return fail(context, 404, "not_found", result.message);
}

export function commandFailureResponse(context: AppContext, result: CommandResult): Response {
  if (result.status === "conflict") return fail(context, 409, "idempotency_conflict", result.message);
  if (result.status === "policy_conflict") return fail(context, 409, "policy_conflict", result.message);
  if (result.status === "validation") return fail(context, 400, "validation_error", result.message);
  return fail(context, 404, "not_found", result.message);
}

export function parseOptionalInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^-?\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

export function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(value)) return Number.NaN;
  return Number(value);
}

export type { AppBindings };
