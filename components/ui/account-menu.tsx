"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUserSummary } from "@/lib/auth-types";
import {
  type OpenAiKeyState,
  OpenAiKeyManager,
} from "@/components/account/openai-key-manager";
import { authClient } from "@/lib/auth-client";
import { AppButton } from "@/components/ui/primitives";

export function AccountMenu({
  user,
  disabled = false,
  onOpenAiKeyChange,
}: {
  user: AuthenticatedUserSummary;
  disabled?: boolean;
  onOpenAiKeyChange?: (state: OpenAiKeyState) => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleSignOut() {
    if (busy || disabled) {
      return;
    }

    setBusy(true);
    setSignOutError("");

    try {
      await authClient.signOut();
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="group min-w-[132px] flex min-h-[42px] items-center justify-between gap-3 rounded-xl border border-[var(--border)]/50 bg-[#0A0A0A] px-3 py-2 text-left transition-all duration-300 hover:bg-[#141414] hover:border-[var(--accent-strong)]/30 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="min-w-0 flex-1 relative z-10">
          <p className="truncate text-sm font-medium text-white">
            {user.username}
          </p>
        </div>
        <div className="w-5 h-5 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-soft)] group-hover:text-[var(--accent-strong)] transition-colors relative z-10 shrink-0">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
      </button>
      {open ? (
        <div className="motion-fade-in-fast motion-scale-in-fast absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[22rem] rounded-xl border border-[var(--border)]/80 bg-[#0A0A0A]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/40 to-transparent opacity-50" />

          <div className="mb-4 pb-4 border-b border-[var(--border)]/40 relative">
            <div className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_8px_var(--accent-strong)]" />
            <div className="pl-4">
              <p className="truncate text-sm font-semibold text-white tracking-tight">
                {user.displayName}
              </p>
              <p className="truncate text-xs text-[var(--text-soft)] mt-1">
                {user.email}
              </p>
            </div>
          </div>
          <OpenAiKeyManager
            initialState={{
              hasOpenAiKey: user.hasOpenAiKey,
              maskedOpenAiKey: user.maskedOpenAiKey,
            }}
            onStateChange={onOpenAiKeyChange}
          />
          <AppButton
            type="button"
            tone="ghost"
            disabled={busy || disabled}
            onClick={handleSignOut}
            className="mt-4 w-full justify-start h-9 px-3 text-xs border border-transparent hover:bg-[var(--surface-2)] hover:border-[var(--border)] transition-all"
          >
            {busy ? "Terminating Session..." : "Terminate Session"}
          </AppButton>
          {signOutError ? (
            <p className="mt-2 text-xs text-[rgb(255,179,173)]">{signOutError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
