import type { Route } from "next";
import { redirect } from "next/navigation";
import { OpenAiSetupForm } from "@/components/account/openai-setup-form";
import { AppNavLink } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth-helpers";
import { getSafeRedirectPath } from "@/lib/redirects";

export const dynamic = "force-dynamic";

export default async function OpenAiSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await requireUser("/setup/openai");
  const requestedNextPath = getSafeRedirectPath(next, "/studio/new");
  const nextPath = requestedNextPath.startsWith("/setup/openai")
    ? "/studio/new"
    : requestedNextPath;

  if (user.hasOpenAiKey) {
    redirect(nextPath as Route);
  }

  return (
    <main className="min-h-screen text-white overflow-hidden relative font-sans">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex min-h-screen flex-col relative z-10">
        <header className="flex flex-wrap items-center justify-between gap-4 py-6 border-b border-[var(--border)]/50">
          <AppNavLink
            href="/"
            className="brand-mark text-3xl md:text-4xl text-white hover:opacity-80 transition-opacity"
          >
            Mivo
          </AppNavLink>
          <div className="min-w-[132px] text-right text-xs text-[var(--text-soft)]">
            {user.username}
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-16 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--accent-strong)]/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="flex flex-col lg:flex-row flex-1 items-center justify-between gap-16 w-full">
            <div className="min-w-0 flex-1 max-w-2xl lg:max-w-none">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md mb-8">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  One-Time Setup
                </span>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.5rem] leading-[1.05] tracking-tight mb-8">
                Power your <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--accent-strong)]">
                  workspace.
                </span>
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-[var(--text-muted)] max-w-xl mb-12">
                Mivo uses your own OpenAI key for generation, rewrite, and
                attachment grounding. Save it once and start creating.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 max-w-2xl">
                {[
                  {
                    label: "01",
                    text: "Your key is encrypted at rest with AES-256-GCM.",
                  },
                  {
                    label: "02",
                    text: "Only your account can decrypt and use the stored key.",
                  },
                  {
                    label: "03",
                    text: "Replace or remove your key at any time from the menu.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[#0A0A0A] hover:bg-[#0F0F0F] transition-colors flex items-start gap-4"
                  >
                    <div className="text-[10px] text-[var(--accent-strong)] font-mono font-semibold shrink-0 pt-1">
                      {item.label}
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0">
              <OpenAiSetupForm nextPath={nextPath} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
