"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppButton, AppInput, AppNavLink, AppPanel, AppSelect, FieldLabel } from "@/components/ui/primitives";

const contentTypes = [
  { value: "social_post", label: "Social Post" },
  { value: "blog_post", label: "Blog Post" },
  { value: "landing_page", label: "Landing Page" }
];

export function NewDocumentForm() {
  const router = useRouter();
  const [contentType, setContentType] = useState("blog_post");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contentType,
          title: title || "Untitled draft"
        })
      });

      const payload = await response.json();
      router.push(`/studio/${payload.document.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8 md:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between py-4">
          <AppNavLink href="/" className="brand-mark text-[2.65rem] text-[var(--text)]">
            mivo
          </AppNavLink>
          <AppNavLink href="/studio/new">Studio</AppNavLink>
        </header>
        <div className="grid flex-1 items-center gap-14 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
          <div className="min-w-0">
            <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Create draft</p>
            <h1 className="font-display max-w-xl text-5xl leading-[0.9] md:text-7xl">
              Start from a cleaner brief and open directly into the working studio.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[var(--text-muted)]">
              Choose the format, name the draft, and land in an editor built for progressive generation, checkpointed versions, and selective rewrites.
            </p>
            <div className="mt-10 studio-list max-w-xl">
              {[
                "Social posts for a tighter first-pass narrative",
                "Blog drafts with structured sections and rewrite controls",
                "Landing pages composed from reusable editorial blocks"
              ].map((line) => (
                <div key={line} className="studio-list-row">
                  <p className="studio-list-copy text-sm leading-7 text-[var(--text-soft)]">{line}</p>
                </div>
              ))}
            </div>
          </div>
          <AppPanel className="p-8 md:p-10">
            <form onSubmit={handleSubmit}>
              <div className="space-y-7">
                <label className="space-y-3">
                  <FieldLabel>Content Type</FieldLabel>
                  <AppSelect value={contentType} onValueChange={setContentType} options={contentTypes} />
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
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <AppButton type="submit" disabled={submitting} tone="primary" size="3">
                  {submitting ? "Creating..." : "Open Studio"}
                </AppButton>
                <AppNavLink href="/">Back home</AppNavLink>
              </div>
            </form>
          </AppPanel>
        </div>
      </div>
    </main>
  );
}
