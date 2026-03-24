"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AppButton,
  AppInput,
  AppPanel,
  AppSelect,
  FieldLabel,
  AppNavLink
} from "@/components/ui/primitives";

const contentTypes = [
  { value: "social_post", label: "Social Post" },
  { value: "blog_post", label: "Blog Post" },
  { value: "landing_page", label: "Landing Page" },
];

export function NewDocumentForm() {
  const router = useRouter();
  const [contentType, setContentType] = useState("blog_post");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType,
          title: title || "Untitled draft",
        }),
      });

      const payload = (await response.json()) as {
        document?: { id?: string };
        error?: string;
      };

      if (!response.ok || !payload.document?.id) {
        setErrorMessage(
          payload.error ?? "Unable to create the document right now.",
        );
        return;
      }

      router.push(`/studio/${payload.document.id}`);
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
        </header>
        <div className="flex flex-col lg:flex-row flex-1 items-center justify-between gap-16 py-16 lg:py-0">
          <div className="min-w-0 flex-1 max-w-2xl lg:max-w-none">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md mb-8">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Initialize Sequence
              </span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.5rem] leading-[1.05] tracking-tight mb-8">
              Configure your <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--accent-strong)]">
                workspace.
              </span>
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed text-[var(--text-muted)] max-w-xl mb-12">
              Define the schema, instantiate the document, and seamlessly
              transition into the intelligent composer environment.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
              {[
                "Social posts for concise, high-impact narrative structures.",
                "Blog drafts embedded with auto-resolving sectional context.",
                "Landing pages synthesized from foundational brand assets.",
              ].map((line, i) => (
                <div
                  key={line}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[#0A0A0A] hover:bg-[#0F0F0F] transition-colors flex items-start gap-4"
                >
                  <div className="text-[10px] text-[var(--accent-strong)] font-mono font-semibold shrink-0 pt-1">
                    0{i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <AppPanel className="p-8 md:p-10 w-full lg:w-[480px] xl:w-[520px] shrink-0 border border-[var(--border)]/50 bg-[#0A0A0A]/80 backdrop-blur-xl relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/30 to-transparent opacity-50" />
            <form onSubmit={handleSubmit}>
              <div className="space-y-7">
                <label className="space-y-3">
                  <FieldLabel>Content Type</FieldLabel>
                  <AppSelect
                    value={contentType}
                    onValueChange={setContentType}
                    options={contentTypes}
                  />
                </label>
                <label className="space-y-3">
                  <FieldLabel>Title</FieldLabel>
                  <AppInput
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Untitled draft"
                    className="h-12"
                  />
                </label>
              </div>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <AppButton
                  type="submit"
                  disabled={submitting}
                  tone="primary"
                  size="3"
                  className="w-full sm:w-auto h-12 px-8 shadow-[0_0_20px_rgba(47,223,160,0.15)]"
                >
                  {submitting ? "Launching..." : "Launch App"}
                </AppButton>
                <AppNavLink
                  href="/"
                  className="text-sm text-[var(--text-soft)] hover:text-white transition-colors text-center"
                >
                  Cancel
                </AppNavLink>
              </div>
              {errorMessage ? (
                <p className="mt-4 text-sm text-[rgb(255,179,173)]">
                  {errorMessage}
                </p>
              ) : null}
            </form>
          </AppPanel>
        </div>
      </div>
    </main>
  );
}
