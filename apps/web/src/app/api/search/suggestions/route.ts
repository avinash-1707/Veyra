import { getSearchSuggestions } from "@/lib/api/server/discovery";

const maxQueryLength = 200;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  if (query.length > maxQueryLength) {
    return Response.json({ error: "Search query must be 200 characters or fewer." }, { status: 400 });
  }

  if (query.length === 0) return Response.json({ suggestions: [] });

  try {
    return Response.json({ suggestions: await getSearchSuggestions(query) });
  } catch {
    return Response.json(
      { error: "Search suggestions are temporarily unavailable.", suggestions: [] },
      { status: 503 }
    );
  }
}
