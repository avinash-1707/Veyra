import type { PageInfo } from "@veyra/contracts";

export type CursorPagination = { cursor?: string; limit: number };
export type Page<T> = { items: T[]; pageInfo: PageInfo };

const defaultLimit = 20;
const maxLimit = 100;

export function parsePagination(query: { cursor?: string | undefined; limit?: string | undefined }): CursorPagination {
  const requested = query.limit === undefined ? defaultLimit : Number(query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, maxLimit) : defaultLimit;
  return { ...(query.cursor === undefined || query.cursor.trim() === "" ? {} : { cursor: query.cursor }), limit };
}

export function paginateByCursor<T>(items: T[], pagination: CursorPagination, cursorFor: (item: T) => string): Page<T> {
  const startIndex =
    pagination.cursor === undefined
      ? 0
      : Math.max(0, items.findIndex((item) => cursorFor(item) === pagination.cursor) + 1);
  const pageItems = items.slice(startIndex, startIndex + pagination.limit);
  const hasNextPage = startIndex + pagination.limit < items.length;
  const nextCursor = hasNextPage && pageItems.length > 0 ? cursorFor(pageItems[pageItems.length - 1]!) : null;
  return { items: pageItems, pageInfo: { nextCursor, hasNextPage, limit: pagination.limit } };
}
