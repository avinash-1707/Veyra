import { auth } from "../modules/identity/auth.js";
import { app } from "../index.js";

export async function authenticatedShopperHeaders(): Promise<Record<string, string>> {
  const response = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test Shopper",
      email: `${crypto.randomUUID()}@example.test`,
      password: "test-password"
    })
  });
  const cookie = response.headers.get("set-cookie");
  if (response.status !== 200 || cookie === null) throw new Error("Unable to create a test Better Auth session.");

  return {
    origin: "http://localhost:3000",
    cookie: `${cookie}; veyra_csrf=csrf-token`,
    "x-csrf-token": "csrf-token"
  };
}

export async function authenticatedShopperId(headers: Record<string, string>): Promise<string> {
  const session = await auth.api.getSession({ headers: new Headers(headers) });
  if (session === null) throw new Error("Unable to resolve the test Better Auth session.");
  return session.user.id;
}
