"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AppButton } from "@/components/ui/primitives";

export type OpenAiKeyState = {
  hasOpenAiKey: boolean;
  maskedOpenAiKey: string | null;
};

type OpenAiKeyManagerProps = {
  initialState: OpenAiKeyState;
  mode: "setup" | "gate" | "menu";
  nextPath?: string;
  onStateChange?: (state: OpenAiKeyState) => void;
};

type KeySummaryResponse = OpenAiKeyState & {
  openAiKeyUpdatedAt?: string | null;
};

function normalizeSummary(payload: KeySummaryResponse): OpenAiKeyState {
  return {
    hasOpenAiKey: payload.hasOpenAiKey,
    maskedOpenAiKey: payload.maskedOpenAiKey,
  };
}

export function OpenAiKeyManager({
  initialState,
  mode,
  nextPath,
  onStateChange,
}: OpenAiKeyManagerProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [draftKey, setDraftKey] = useState("");
  const [revealedKey, setRevealedKey] = useState("");
  const [showRevealedKey, setShowRevealedKey] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialState.hasOpenAiKey || mode !== "menu");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const description = useMemo(() => {
    if (mode === "setup") {
      return "Add your OpenAI key before entering the studio.";
    }

    if (mode === "menu") {
      return "Used for generation, rewrite, and attachment grounding.";
    }

    return "Generation stays locked until a valid key is saved.";
  }, [mode]);

  function syncState(nextState: OpenAiKeyState) {
    setState(nextState);
    onStateChange?.(nextState);
  }

  async function handlePaste() {
    setErrorMessage("");

    try {
      const value = await navigator.clipboard.readText();
      setDraftKey(value.trim());
    } catch {
      setErrorMessage("Clipboard access is unavailable in this browser.");
    }
  }

  async function handleSave() {
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

      const nextState = normalizeSummary(payload);
      syncState(nextState);
      setDraftKey("");
      setRevealedKey("");
      setShowRevealedKey(false);
      setIsEditing(mode !== "menu");
      router.refresh();

      if (mode === "setup") {
        router.push((nextPath ?? "/studio/new") as Route);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save OpenAI key.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (removing) {
      return;
    }

    setRemoving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/account/openai-key", {
        method: "DELETE",
      });
      const payload = (await response.json()) as KeySummaryResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove OpenAI key.");
      }

      const nextState = normalizeSummary(payload);
      syncState(nextState);
      setDraftKey("");
      setRevealedKey("");
      setShowRevealedKey(false);
      setIsEditing(true);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to remove OpenAI key.",
      );
    } finally {
      setRemoving(false);
    }
  }

  async function handleRevealToggle() {
    if (showRevealedKey) {
      setShowRevealedKey(false);
      return;
    }

    if (revealedKey) {
      setShowRevealedKey(true);
      return;
    }

    setRevealing(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/account/openai-key/reveal", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        apiKey?: string;
        error?: string;
      };

      if (!response.ok || !payload.apiKey) {
        throw new Error(payload.error ?? "Unable to reveal OpenAI key.");
      }

      setRevealedKey(payload.apiKey);
      setShowRevealedKey(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to reveal OpenAI key.",
      );
    } finally {
      setRevealing(false);
    }
  }

  const keyValue = showRevealedKey ? revealedKey : state.maskedOpenAiKey ?? "";
  const showMenuReadState = mode === "menu" && state.hasOpenAiKey && !isEditing;

  return (
    <div
      className={clsx(
        "border border-[var(--border)]/70 bg-[#0D0F0E]",
        mode === "menu" ? "rounded-lg p-3" : "rounded-xl p-4 sm:p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">OpenAI Key</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
            {description}
          </p>
        </div>
        {showMenuReadState ? (
          <button
            type="button"
            onClick={handleRevealToggle}
            disabled={revealing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[#121413] text-[var(--text-soft)] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={showRevealedKey ? "Hide OpenAI key" : "Reveal OpenAI key"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {showRevealedKey ? (
                <>
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.69-1.94 1.79-3.67 3.18-5.06" />
                  <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                  <path d="M1 1l22 22" />
                  <path d="M9.88 4.24A10.93 10.93 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-4.17 5.94" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        ) : null}
      </div>

      {showMenuReadState ? (
        <>
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[#111413] px-3 py-2.5">
            <p className="font-mono text-xs text-[var(--text)] break-all">
              {keyValue}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <AppButton
              type="button"
              tone="secondary"
              size="2"
              className="h-9 rounded-lg px-3 text-xs"
              onClick={() => {
                setIsEditing(true);
                setErrorMessage("");
              }}
            >
              Replace
            </AppButton>
            <AppButton
              type="button"
              tone="ghost"
              size="2"
              className="h-9 rounded-lg px-3 text-xs"
              disabled={removing}
              onClick={() => {
                void handleRemove();
              }}
            >
              {removing ? "Removing..." : "Remove"}
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <div className="relative mt-4">
            <input
              type="password"
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="h-12 w-full rounded-lg border border-[var(--border)] bg-[#111413] px-3 pr-20 text-sm text-white outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-strong)]/50"
            />
            <button
              type="button"
              onClick={() => {
                void handlePaste();
              }}
              className="absolute right-2 top-1/2 inline-flex h-8 -translate-y-1/2 items-center justify-center rounded-md border border-[var(--border)] bg-[#161918] px-2.5 text-xs text-[var(--text-soft)] transition-colors hover:text-white"
            >
              Paste
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AppButton
              type="button"
              tone="primary"
              size="3"
              className="h-10 rounded-lg px-4 text-xs"
              disabled={!draftKey.trim() || saving}
              onClick={() => {
                void handleSave();
              }}
            >
              {saving ? "Saving..." : state.hasOpenAiKey ? "Replace Key" : "Save Key"}
            </AppButton>
            {mode === "menu" && state.hasOpenAiKey ? (
              <AppButton
                type="button"
                tone="ghost"
                size="3"
                className="h-10 rounded-lg px-4 text-xs"
                onClick={() => {
                  setDraftKey("");
                  setIsEditing(false);
                  setErrorMessage("");
                }}
              >
                Cancel
              </AppButton>
            ) : null}
          </div>
        </>
      )}

      {errorMessage ? (
        <p className="mt-3 text-xs text-[rgb(255,179,173)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
