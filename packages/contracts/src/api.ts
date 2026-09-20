import { z } from "zod";

export const apiVersionSchema = z.literal("v1");

export const requestIdSchema = z.string().min(1);

export const apiErrorCodeSchema = z.enum([
  "not_found",
  "internal_error",
  "validation_error",
  "payload_too_large",
  "too_many_requests",
  "request_timeout",
  "forbidden",
  "idempotency_conflict",
  "policy_conflict"
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string().min(1)
});

export function apiSuccessSchema<DataSchema extends z.ZodType>(dataSchema: DataSchema) {
  return z.object({
    apiVersion: apiVersionSchema,
    requestId: requestIdSchema,
    data: dataSchema
  });
}

export const apiErrorResponseSchema = z.object({
  apiVersion: apiVersionSchema,
  requestId: requestIdSchema,
  error: apiErrorSchema
});

export type ApiVersion = z.infer<typeof apiVersionSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type ApiSuccessResponse<Data> = {
  apiVersion: ApiVersion;
  requestId: string;
  data: Data;
};
