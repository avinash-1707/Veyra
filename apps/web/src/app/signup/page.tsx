import { redirect } from "next/navigation";

import { AuthForm } from "@/components/marketplace/auth-form";

import { getShopperSession } from "../lib/session";

export const dynamic = "force-dynamic";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export default async function SignupPage() {
  if (await getShopperSession()) redirect("/account");

  return (
    <main className="page-shell auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <p className="eyebrow">Start shopping</p>
        <h1 id="signup-title">Create your Veyra account.</h1>
        <p>Keep order history and self-service support together in one shopper account.</p>
        <AuthForm mode="signup" googleEnabled={googleEnabled} />
      </section>
    </main>
  );
}
