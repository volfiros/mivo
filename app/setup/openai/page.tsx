import type { Route } from "next";
import { redirect } from "next/navigation";
import { OpenAiKeyManager } from "@/components/account/openai-key-manager";
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

        <div className="flex flex-1 items-center justify-between gap-16 py-16 lg:py-0">
          <div className="min-w-0 flex-1 max-w-2xl">
            <p className="text-sm text-[var(--text-soft)]">Account setup</p>
            <h1 className="mt-5 font-display text-5xl sm:text-6xl leading-[1.04] tracking-tight">
              Connect your
              <br />
              OpenAI key.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--text-muted)]">
              Mivo now runs on the key attached to your account. Save it once,
              then continue into workspace creation.
            </p>
          </div>

          <div className="w-full max-w-[520px] shrink-0">
            <div className="rounded-xl border border-[var(--border)] bg-[#0A0A0A] p-6">
              <OpenAiKeyManager
                initialState={{
                  hasOpenAiKey: user.hasOpenAiKey,
                  maskedOpenAiKey: user.maskedOpenAiKey,
                }}
                mode="setup"
                nextPath={nextPath}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
