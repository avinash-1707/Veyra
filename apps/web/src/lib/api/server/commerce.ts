import "server-only";

import { apiGet } from "./client";
import type { Cart } from "../types";

export async function getCart(): Promise<Cart> {
  return apiGet<Cart>("/v1/cart", { unavailableMessage: "Catalog service is unavailable." });
}
