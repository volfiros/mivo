"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUserSummary } from "@/lib/auth-types";
import { authClient } from "@/lib/auth-client";
import { AppButton } from "@/components/ui/primitives";

export function AccountMenu({
  user,
  disabled = false,
}: {
  user: AuthenticatedUserSummary;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy || disabled) {
      return;
    }

    setBusy(true);

    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="group min-w-[168px] flex items-center justify-between gap-3 rounded-xl border border-[var(--border)]/50 bg-[#0A0A0A] px-3 py-2 text-left transition-all duration-300 hover:bg-[#141414] hover:border-[var(--accent-strong)]/30 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="min-w-0 relative z-10">
          <p className="truncate text-sm font-medium text-white">
            {user.username}
          </p>
          <p className="truncate text-[9px] font-mono uppercase tracking-widest text-[var(--accent-strong)]/80 mt-0.5">
            {user.email}
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
        <div className="motion-fade-in-fast motion-scale-in-fast absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-[var(--border)]/80 bg-[#0A0A0A]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/40 to-transparent opacity-50" />

          <div className="mb-5 pb-4 border-b border-[var(--border)]/40 relative">
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
          <AppButton
            type="button"
            tone="ghost"
            disabled={busy || disabled}
            onClick={handleSignOut}
            className="w-full justify-start h-9 px-3 text-xs border border-transparent hover:bg-[var(--surface-2)] hover:border-[var(--border)] transition-all"
          >
            {busy ? "Terminating Session..." : "Terminate Session"}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
