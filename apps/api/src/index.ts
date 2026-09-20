import { productSeedListResponseSchema } from "@veyra/contracts";
import { Hono } from "hono";

import { catalogSeedProducts } from "./catalogSeed.js";

export const app = new Hono();

app.get("/health", (context) => {
  return context.json({ status: "ok" });
});

app.get("/v1/products/seed", (context) => {
  const response = productSeedListResponseSchema.parse({
    apiVersion: "v1",
    data: catalogSeedProducts
  });

  return context.json(response);
});

export default app;
