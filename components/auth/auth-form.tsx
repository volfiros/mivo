"use client";

import { useState, type FormEvent } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getSafeRedirectPath } from "@/lib/redirects";
import {
  AppButton,
  AppInput,
  AppNavLink,
  AppPanel,
  FieldLabel,
} from "@/components/ui/primitives";

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: "sign-in" | "sign-up";
  nextPath: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const destination = getSafeRedirectPath(nextPath, "/studio");
  const alternateHref =
    mode === "sign-in"
      ? `/auth/sign-up?next=${encodeURIComponent(destination)}`
      : `/auth/sign-in?next=${encodeURIComponent(destination)}`;

  async function signUpWithUsername() {
    const response = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name: username,
        username,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    if (!response.ok) {
      return {
        error: {
          message:
            payload?.message ??
            payload?.error ??
            "Unable to create account.",
        },
      };
    }

    return { error: null };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const result =
        mode === "sign-up"
          ? await signUpWithUsername()
          : await authClient.signIn.email({
              email,
              password,
            });

      if (result.error) {
        setErrorMessage(
          result.error.message ??
            (mode === "sign-up"
              ? "Unable to create account."
              : "Unable to sign in."),
        );
        return;
      }

      router.push(destination as Route);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen text-white overflow-hidden relative font-sans">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex min-h-screen flex-col relative z-10">
        <header className="flex items-center justify-between py-6 border-b border-[var(--border)]/50">
          <AppNavLink
            href="/"
            className="brand-mark text-3xl md:text-4xl text-white hover:opacity-80 transition-opacity"
          >
            Mivo
          </AppNavLink>
          <AppNavLink
            href={alternateHref}
            className="text-sm text-[var(--text-soft)] hover:text-white transition-colors"
          >
            {mode === "sign-in" ? "Create account" : "Have an account?"}
          </AppNavLink>
        </header>
        <div className="flex flex-1 items-center justify-center py-16 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--accent-strong)]/10 blur-[120px] rounded-full pointer-events-none" />

          <AppPanel className="w-full max-w-md border border-[var(--border)]/50 bg-[#0A0A0A]/80 p-8 md:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/50 to-transparent opacity-50" />

            <div className="relative z-10 mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[#141414]/50 backdrop-blur-md mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_8px_var(--accent-strong)]" />
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-soft)]">
                  {mode === "sign-in" ? "Authentication" : "Provisioning"}
                </span>
              </div>
              <h1 className="font-display text-4xl text-white tracking-tight leading-tight">
                {mode === "sign-in" ? "Initialize Session" : "Create Identity"}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
                {mode === "sign-in"
                  ? "Authenticate to access your active drafts, version history, and grounded workspaces."
                  : "Provision your identity to retain persistent drafts and editorial checkpoints."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {mode === "sign-up" ? (
                <label className="block space-y-2.5">
                  <FieldLabel className="text-[10px] uppercase tracking-wider text-[var(--text-soft)]">
                    Username
                  </FieldLabel>
                  <AppInput
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="user.name"
                    className="h-12 bg-[#141414]/50 border-[var(--border)]/50 focus:bg-[#1a1a1a]/80 transition-colors"
                    required
                  />
                </label>
              ) : null}
              <label className="block space-y-2.5">
                <FieldLabel className="text-[10px] uppercase tracking-wider text-[var(--text-soft)]">
                  Email Designation
                </FieldLabel>
                <AppInput
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@domain.com"
                  type="email"
                  className="h-12 bg-[#141414]/50 border-[var(--border)]/50 focus:bg-[#1a1a1a]/80 transition-colors"
                  required
                />
              </label>
              <label className="block space-y-2.5">
                <FieldLabel className="text-[10px] uppercase tracking-wider text-[var(--text-soft)]">
                  Security Token
                </FieldLabel>
                <AppInput
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  type="password"
                  className="h-12 bg-[#141414]/50 border-[var(--border)]/50 focus:bg-[#1a1a1a]/80 transition-colors"
                  required
                />
              </label>

              <div className="pt-6 space-y-4">
                <AppButton
                  type="submit"
                  disabled={submitting}
                  tone="primary"
                  className="w-full h-12 shadow-[0_0_20px_rgba(47,223,160,0.15)] group-hover:shadow-[0_0_25px_rgba(47,223,160,0.2)] transition-all duration-500"
                >
                  {submitting
                    ? mode === "sign-in"
                      ? "Authenticating..."
                      : "Provisioning Identity..."
                    : mode === "sign-in"
                      ? "Establish Session"
                      : "Initialize Account"}
                </AppButton>

                <AppNavLink
                  href={alternateHref}
                  className="block text-center text-xs text-[var(--text-soft)] hover:text-white transition-colors"
                >
                  {mode === "sign-in"
                    ? "Requires clearance? Provision identity"
                    : "Identity established? Authenticate"}
                </AppNavLink>
              </div>
              {errorMessage ? (
                <div className="mt-4 p-3 rounded-lg border border-[rgb(255,179,173)]/20 bg-[rgb(255,179,173)]/5 text-center">
                  <p className="text-xs text-[rgb(255,179,173)]">
                    {errorMessage}
                  </p>
                </div>
              ) : null}
            </form>
          </AppPanel>
        </div>
      </div>
    </main>
  );
}
