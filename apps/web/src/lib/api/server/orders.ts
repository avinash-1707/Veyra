import "server-only";

import { apiGet } from "./client";
import type { Order, Paginated } from "../types";

const unavailableMessage = "Your account data is unavailable.";

export async function getOrders(): Promise<Order[]> {
  const page = await apiGet<Paginated<Order>>("/v1/orders", { authenticated: true, unavailableMessage });
  return page.items;
}

export async function getOrder(orderId: string): Promise<Order> {
  return apiGet<Order>(`/v1/orders/${encodeURIComponent(orderId)}`, { authenticated: true, unavailableMessage });
}
