import { NextResponse } from "next/server";

const apiOrigin = process.env.VEYRA_API_ORIGIN ?? "http://localhost:8787";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const target = new URL(`/api/auth/${path.map(encodeURIComponent).join("/")}`, apiOrigin);
  target.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    // Next must not buffer password-bearing requests before forwarding them.
    duplex: "half"
  } as RequestInit);

  const responseHeaders = new Headers(response.headers);
  return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
