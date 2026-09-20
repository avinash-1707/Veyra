import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { NavbarSearch } from "../navbar-search";

describe("NavbarSearch", () => {
  it("keeps the guided-search form and accessible combobox inside the query provider", () => {
    const markup = renderToStaticMarkup(
      createElement(QueryClientProvider, { client: new QueryClient() }, createElement(NavbarSearch))
    );

    expect(markup).toContain('action="/intelligent-search"');
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-autocomplete="list"');
  });
});
