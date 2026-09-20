import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getShopperSession } = vi.hoisted(() => ({ getShopperSession: vi.fn() }));

vi.mock("@/app/lib/session", () => ({ getShopperSession }));
vi.mock("../navbar-search", () => ({ NavbarSearch: () => null }));

import { SiteHeader } from "../shell";

describe("SiteHeader", () => {
  beforeEach(() => {
    getShopperSession.mockReset();
  });

  it("shows real login and sign-up links without a session", async () => {
    getShopperSession.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/signup"');
    expect(markup).not.toContain("Open account menu for");
    expect(markup.indexOf('href="/intelligent-search"')).toBeLessThan(markup.indexOf('href="/cart"'));
    expect(markup.indexOf('href="/cart"')).toBeLessThan(markup.indexOf('href="/login"'));
    expect(markup.indexOf('href="/login"')).toBeLessThan(markup.indexOf('href="/signup"'));
  });

  it("shows the account trigger instead of authentication CTAs for a shopper session", async () => {
    getShopperSession.mockResolvedValue({
      user: { id: "shopper-1", name: "Aarav Sharma", email: "aarav@example.test", image: null },
      session: { expiresAt: "2026-10-01T00:00:00.000Z" }
    });

    const markup = renderToStaticMarkup(await SiteHeader());

    expect(markup).toContain("Open account menu for Aarav Sharma");
    expect(markup).not.toContain('href="/login"');
    expect(markup).not.toContain('href="/signup"');
  });
});
