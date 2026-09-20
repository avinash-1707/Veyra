"use client";

import Link from "next/link";
import { useState } from "react";

type AuthMode = "login" | "signup";
type FormErrors = Partial<Record<"name" | "email" | "password", string>>;

export function AuthForm({ mode, googleEnabled = false }: { mode: AuthMode; googleEnabled?: boolean }) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const isSignUp = mode === "signup";

  async function submit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: FormErrors = {};
    if (isSignUp && name.length < 2) nextErrors.name = "Enter the name you would like us to use.";
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setMessage(undefined);
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${isSignUp ? "sign-up" : "sign-in"}/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isSignUp ? { name, email, password } : { email, password })
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => undefined);
        setMessage(errorMessage(payload, isSignUp));
        return;
      }
      window.location.assign("/account");
    } catch {
      setMessage("We could not reach the account service. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function continueWithGoogle() {
    setMessage(undefined);
    setGooglePending(true);
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: "/account", disableRedirect: true })
      });
      const payload: unknown = await response.json();
      const url = socialRedirectUrl(payload);
      if (!response.ok || url === undefined) {
        setMessage("Google sign-in could not start. Please try again.");
        return;
      }
      window.location.assign(url);
    } catch {
      setMessage("Google sign-in could not start. Please try again.");
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <form className="auth-form" action={submit}>
      {isSignUp ? (
        <label>
          Display name
          <input name="name" autoComplete="name" aria-describedby={errors.name ? "name-error" : undefined} />
          {errors.name ? (
            <span id="name-error" className="form-error">
              {errors.name}
            </span>
          ) : null}
        </label>
      ) : null}
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email ? (
          <span id="email-error" className="form-error">
            {errors.email}
          </span>
        ) : null}
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password ? (
          <span id="password-error" className="form-error">
            {errors.password}
          </span>
        ) : null}
      </label>
      {message ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={pending || googlePending}>
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Log in"}
      </button>
      {googleEnabled ? (
        <button
          className="google-sign-in"
          type="button"
          disabled={pending || googlePending}
          onClick={continueWithGoogle}
        >
          {googlePending ? "Connecting to Google…" : "Continue with Google"}
        </button>
      ) : null}
      <p className="auth-switch">
        {isSignUp ? "Already have an account?" : "New to Veyra?"}{" "}
        <Link href={isSignUp ? "/login" : "/signup"}>{isSignUp ? "Log in" : "Sign up"}</Link>
      </p>
    </form>
  );
}

function socialRedirectUrl(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const url = (payload as Record<string, unknown>).url;
  return typeof url === "string" ? url : undefined;
}

function errorMessage(payload: unknown, isSignUp: boolean): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as Record<string, unknown>).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return isSignUp
    ? "We could not create your account. Check your details and try again."
    : "Those details did not match an account.";
}
