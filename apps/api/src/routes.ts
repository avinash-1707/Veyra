import type { Hono } from "hono";

import { cartRoutes } from "./modules/cart/route.js";
import { discoveryRoutes } from "./modules/discovery/route.js";
import { intelligenceRoutes } from "./modules/intelligence/route.js";
import { orderRoutes } from "./modules/orders/route.js";
import { returnRoutes } from "./modules/returns/route.js";
import type { AppBindings } from "./platform/http.js";

export function registerRoutes(app: Hono<AppBindings>): void {
  app.route("/", discoveryRoutes);
  app.route("/", intelligenceRoutes);
  app.route("/", cartRoutes);
  app.route("/", orderRoutes);
  app.route("/", returnRoutes);
}
