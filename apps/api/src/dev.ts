import { serve } from "@hono/node-server";

import app from "./index.js";

const defaultPort = 8787;
const parsedPort = Number(process.env.PORT ?? defaultPort);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : defaultPort;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Veyra API listening on http://localhost:${info.port}`);
});
