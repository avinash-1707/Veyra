import { redirect } from "next/navigation";

import { AuthForm } from "@/components/marketplace/auth-form";

import { getShopperSession } from "../lib/session";

export const dynamic = "force-dynamic";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export default async function LoginPage() {
  if (await getShopperSession()) redirect("/account");

  return (
    <main className="page-shell auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Welcome back</p>
        <h1 id="login-title">Log in to continue your shopping.</h1>
        <p>View your orders and continue with the same shopper account across Veyra.</p>
        <AuthForm mode="login" googleEnabled={googleEnabled} />
      </section>
    </main>
  );
}
