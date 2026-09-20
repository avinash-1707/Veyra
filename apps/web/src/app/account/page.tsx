import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";

import { getShopperSession } from "../lib/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const shopper = await getShopperSession();
  if (!shopper) redirect("/login");

  const expiresAt = new Date(shopper.session.expiresAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <main className="page-shell">
      <section className="hero py-8">
        <p className="eyebrow">Your account</p>
        <h1>Welcome, {shopper.user.name}.</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Your account keeps your shopper identity and self-service order support in one place.
        </p>
      </section>
      <section className="account-details" aria-label="Account details">
        <dl>
          <div>
            <dt>Display name</dt>
            <dd>{shopper.user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{shopper.user.email}</dd>
          </div>
          <div>
            <dt>Current session</dt>
            <dd>Active until {expiresAt}</dd>
          </div>
        </dl>
        <div className="account-page-actions">
          <Link className={buttonVariants()} href="/orders">
            Your orders
          </Link>
          <Link className={buttonVariants({ variant: "outline" })} href="/help">
            Help and support
          </Link>
        </div>
      </section>
    </main>
  );
}
