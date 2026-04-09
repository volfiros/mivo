"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  AppButton,
  AppNavLink,
  AppPanel,
} from "@/components/ui/primitives";

type KeySummaryResponse = {
  hasOpenAiKey: boolean;
  maskedOpenAiKey: string | null;
  openAiKeyUpdatedAt?: string | null;
};

export function OpenAiSetupForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [draftKey, setDraftKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handlePaste() {
    setErrorMessage("");

    try {
      const value = await navigator.clipboard.readText();
      setDraftKey(value.trim());
    } catch {
      setErrorMessage("Clipboard access is unavailable in this browser.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftKey.trim() || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/account/openai-key", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: draftKey.trim(),
        }),
      });
      const payload = (await response.json()) as KeySummaryResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save OpenAI key.");
      }

      router.push(nextPath as Route);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save OpenAI key.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPanel className="w-full border border-[var(--border)]/50 bg-[#0A0A0A]/80 p-8 md:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/50 to-transparent opacity-50" />

      <div className="relative z-10 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[#141414]/50 backdrop-blur-md mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_8px_var(--accent-strong)]" />
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-soft)]">
            Account Setup
          </span>
        </div>
        <h1 className="font-display text-4xl text-white tracking-tight leading-tight">
          Connect your key
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
          Your OpenAI key is encrypted at rest and used only for generation,
          rewrite, and attachment grounding. It is never shared or sent to
          third parties.
        </p>
      </div>

      {saving ? (
        <div className="motion-fade-in-slow flex flex-col items-center justify-center text-center w-full py-8 relative z-10">
          <div className="relative flex items-center justify-center w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent-strong)] animate-spin" />
            <div className="absolute inset-2 rounded-full border-r-2 border-[var(--accent)] animate-[spin_1.5s_linear_infinite_reverse]" />
            <div className="w-3 h-3 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_12px_var(--accent-strong)]" />
          </div>
          <h3 className="font-display text-2xl text-white mb-3">
            Verifying Key
          </h3>
          <div className="flex items-center gap-2 text-xs text-[var(--accent-strong)] font-mono uppercase tracking-widest h-6">
            <span className="animate-pulse">Validating with OpenAI...</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="motion-fade-in relative z-10">
          <div className="space-y-6">
            <label className="block space-y-2.5">
              <span className="app-field-label text-[10px] uppercase tracking-wider text-[var(--text-soft)]">
                OpenAI API Key
              </span>
              <div className="relative">
                <input
                  type="password"
                  value={draftKey}
                  onChange={(event) => setDraftKey(event.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  spellCheck={false}
                  required
                  className="h-12 w-full rounded-lg border border-[var(--border)] bg-[#141414]/50 px-3 pr-20 text-sm text-white outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-strong)]/50 focus:bg-[#1a1a1a]/80"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handlePaste();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[#161918] px-2.5 text-xs text-[var(--text-soft)] transition-colors hover:text-white"
                >
                  Paste
                </button>
              </div>
            </label>
          </div>

          <div className="pt-6 flex flex-col gap-4">
            <AppButton
              type="submit"
              disabled={!draftKey.trim() || saving}
              tone="primary"
              className="w-full h-12 shadow-[0_0_20px_rgba(47,223,160,0.15)] group-hover:shadow-[0_0_25px_rgba(47,223,160,0.2)] transition-all duration-500"
            >
              {saving ? "Verifying..." : "Save & Continue"}
            </AppButton>

            <div className="text-center">
              <AppNavLink
                href="/"
                className="inline-block text-xs text-[var(--text-soft)] hover:text-white transition-colors"
              >
                Cancel
              </AppNavLink>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 p-3 rounded-lg border border-[rgb(255,179,173)]/20 bg-[rgb(255,179,173)]/5 text-center">
              <p className="text-xs text-[rgb(255,179,173)]">
                {errorMessage}
              </p>
            </div>
          ) : null}
        </form>
      )}
    </AppPanel>
  );
}
