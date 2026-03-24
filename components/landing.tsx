"use client";

import { motion } from "framer-motion";
import { AppButtonLink, AppNavLink } from "@/components/ui/primitives";

const supportPoints = [
  {
    value: "Outline first",
    body: "Users see structure immediately before full blocks are resolved."
  },
  {
    value: "Selection rewrite",
    body: "Refine only the text that matters without replacing the whole document."
  },
  {
    value: "Checkpoint history",
    body: "Restore later versions without replaying every edit from the first draft."
  }
];

const workflow = [
  {
    label: "Prompt and source",
    body: "Start with a brief, attach a PDF or note set, and keep the context available to every generation run."
  },
  {
    label: "Valid block stream",
    body: "Placeholders appear first, preview deltas stay transient, and only completed blocks enter the TipTap document."
  },
  {
    label: "Edit while it runs",
    body: "Completed blocks stay editable while later sections continue generating in the same workspace."
  }
];

export function Landing() {
  return (
    <main className="min-h-screen px-6 pb-20 md:px-12">
      <section className="landing-hero">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col">
          <header className="flex items-center justify-between py-8">
            <AppNavLink href="/" className="brand-mark text-[2.65rem] text-[var(--text)]">
              mivo
            </AppNavLink>
            <nav className="flex items-center gap-6">
              <AppNavLink href="/studio/new">Studio</AppNavLink>
              <AppNavLink href="/studio/new">Start</AppNavLink>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-14 pb-14 pt-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0"
            >
              <p className="mb-5 text-sm uppercase tracking-[0.28em] text-[var(--text-soft)]">Editorial AI Studio</p>
              <h1 className="font-display max-w-xl text-5xl leading-[0.88] md:text-8xl">
                Make the draft feel finished before the model stops writing.
              </h1>
              <p className="mt-7 max-w-md text-base leading-7 text-[var(--text-muted)] md:text-lg">
                mivo turns prompts, source files, and revision intent into social posts, blogs, and landing pages with a cleaner, block-native editing flow.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <AppButtonLink href="/studio/new" tone="primary" size="3">
                  Open Studio
                </AppButtonLink>
                <AppButtonLink href="/studio/new" tone="secondary" size="3">
                  Generate First Draft
                </AppButtonLink>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              className="min-w-0"
            >
              <div className="landing-showcase rounded-[32px] p-4 md:p-5">
                <div className="grid min-h-[520px] gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(8,12,10,0.64)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-soft)]">Current session</p>
                    <div className="mt-6 space-y-5">
                      <div>
                        <p className="font-display text-3xl">Blog Post</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                          Outline generated, three sections in progress, editor unlocked.
                        </p>
                      </div>
                      <div className="app-section-divider pt-5">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-soft)]">Context</p>
                        <p className="mt-3 text-sm text-white">Q2 product launch brief.pdf</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          Audience notes, value props, launch timeline
                        </p>
                      </div>
                      <div className="app-section-divider pt-5">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-soft)]">State</p>
                        <p className="mt-3 text-sm text-white">2 / 4 blocks ready</p>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "58%" }}
                            transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-[var(--accent-strong)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(8,12,10,0.48)] p-5">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-soft)]">Draft</p>
                        <p className="font-display mt-2 text-4xl leading-[0.92]">Launch Narrative</p>
                      </div>
                      <span className="rounded-full border border-[rgba(66,230,164,0.26)] bg-[rgba(19,101,74,0.18)] px-3 py-1 text-xs text-[var(--accent-strong)]">
                        Streaming
                      </span>
                    </div>
                    <div className="mt-5 space-y-4">
                      <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(14,20,18,0.82)] p-5">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-soft)]">Hero section</p>
                        <p className="font-display mt-3 text-4xl leading-[0.94]">
                          Launch copy that feels composed, not merely generated.
                        </p>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
                          Start from a brief, keep the structure visible, and let each block resolve only when it is valid enough to belong in the document.
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(14,20,18,0.72)] p-5">
                          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-soft)]">Selection rewrite</p>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                            Refine tone, shorten sections, or sharpen a single paragraph without restarting the whole draft.
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-dashed border-[rgba(66,230,164,0.35)] bg-[rgba(19,101,74,0.08)] p-5">
                          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">Body section</p>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">Generating structured block...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl">
        <section className="app-section-divider py-10">
          <div className="landing-kpi-row">
            {supportPoints.map((point) => (
              <div key={point.value} className="landing-kpi">
                <p className="font-display text-3xl">{point.value}</p>
                <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--text-muted)]">{point.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-12 py-20 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Workflow</p>
            <h2 className="font-display max-w-sm text-5xl leading-[0.92]">
              A calmer path from prompt to publishable structure.
            </h2>
          </div>
          <div className="studio-list">
            {workflow.map((step, index) => (
              <div key={step.label} className="studio-list-row">
                <div className="studio-list-copy">
                  <p className="font-display text-3xl">{step.label}</p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{step.body}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-soft)]">{`0${index + 1}`}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-section-divider flex flex-col gap-8 py-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Start now</p>
            <h2 className="font-display text-5xl leading-[0.92]">
              Open the studio and turn the first prompt into a working draft.
            </h2>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <AppButtonLink href="/studio/new" tone="primary" size="3">
              Start in Studio
            </AppButtonLink>
            <AppButtonLink href="/studio/new" tone="ghost" size="3">
              Create a blank draft
            </AppButtonLink>
          </div>
        </section>
      </div>
    </main>
  );
}
