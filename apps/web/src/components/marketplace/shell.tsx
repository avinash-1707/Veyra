import Link from "next/link";
import { FiShoppingCart } from "react-icons/fi";

import { getShopperSession } from "@/app/lib/session";

import { AccountMenu } from "./account-menu";
import { NavbarSearch } from "./navbar-search";

const footerLinks = [
  { href: "/help", label: "Support and returns" },
  { href: "/orders", label: "Order help" },
  { href: "/intelligent-search", label: "AI guidance policy" }
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to marketplace content
      </a>
      <SiteHeader />
      <div id="main-content" className="site-content" tabIndex={-1}>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

export async function SiteHeader() {
  const shopper = await getShopperSession();

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Primary navigation">
        <Link className="brand-mark" href="/" aria-label="Veyra home">
          Veyra
        </Link>
        <NavbarSearch />
        <div className="nav-actions">
          {shopper ? (
            <AccountMenu shopper={shopper.user} />
          ) : (
            <div className="auth-actions">
              <Link className="login-link" href="/login">
                Log in
              </Link>
              <Link className="signup-link" href="/signup">
                Sign up
              </Link>
            </div>
          )}
          <Link className="guided-search-link" href="/intelligent-search">
            <span aria-hidden="true">✨</span>
            Guided Search
          </Link>
          <Link className="cart-link" href="/cart" aria-label="View cart">
            <FiShoppingCart aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-disclosure">
          Veyra is an India and INR simulation for marketplace evaluation. Payments, delivery dates, seller terms,
          refunds, and AI guidance are informational prototype surfaces until approved production integrations exist.
        </p>
        <ul className="footer-links" aria-label="Footer links">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
