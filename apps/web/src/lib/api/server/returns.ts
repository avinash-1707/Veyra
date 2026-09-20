import "server-only";

import { apiGet } from "./client";
import type { Paginated, ReturnRequest } from "../types";

const unavailableMessage = "Catalog service is unavailable.";

export async function getOrderReturns(orderId: string): Promise<ReturnRequest[]> {
  const page = await apiGet<Paginated<ReturnRequest>>(`/v1/orders/${encodeURIComponent(orderId)}/returns`, {
    unavailableMessage
  });
  return page.items;
}

export async function getReturnRequest(returnId: string): Promise<ReturnRequest> {
  return apiGet<ReturnRequest>(`/v1/returns/${encodeURIComponent(returnId)}`, { unavailableMessage });
}
