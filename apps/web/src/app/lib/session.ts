import "server-only";

import { cookies } from "next/headers";

const apiOrigin = process.env.VEYRA_API_ORIGIN ?? "http://localhost:8787";

export type ShopperSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  session: {
    expiresAt: string | Date;
  };
};

export async function getShopperSession(): Promise<ShopperSession | null> {
  const cookieHeader = (await cookies()).toString();
  if (cookieHeader.length === 0) return null;

  const response = await fetch(`${apiOrigin}/api/auth/get-session`, {
    cache: "no-store",
    headers: { cookie: cookieHeader }
  });
  if (!response.ok) return null;

  const value: unknown = await response.json();
  return isShopperSession(value) ? value : null;
}

function isShopperSession(value: unknown): value is ShopperSession {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const user = record.user;
  const session = record.session;
  return (
    typeof user === "object" &&
    user !== null &&
    typeof (user as Record<string, unknown>).id === "string" &&
    typeof (user as Record<string, unknown>).name === "string" &&
    typeof (user as Record<string, unknown>).email === "string" &&
    typeof session === "object" &&
    session !== null &&
    (typeof (session as Record<string, unknown>).expiresAt === "string" ||
      (session as Record<string, unknown>).expiresAt instanceof Date)
  );
}
