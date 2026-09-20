import "server-only";

import { cookies } from "next/headers";

type ApiEnvelope<Data> = { data: Data };

type ApiClientOptions = {
  authenticated?: boolean;
  unavailableMessage: string;
};

const apiOrigin = process.env.VEYRA_API_ORIGIN ?? "http://localhost:8787";

export async function apiGet<Data>(path: string, options: ApiClientOptions): Promise<Data> {
  const headers = options.authenticated ? { cookie: (await cookies()).toString() } : undefined;
  const response = await fetch(`${apiOrigin}${path}`, { cache: "no-store", headers });

  if (!response.ok) throw new Error(options.unavailableMessage);

  const body: unknown = await response.json();
  if (!isEnvelope<Data>(body)) throw new Error("The service returned an invalid response.");
  return body.data;
}

function isEnvelope<Data>(value: unknown): value is ApiEnvelope<Data> {
  return typeof value === "object" && value !== null && "data" in value;
}
