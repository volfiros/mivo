import type { Route } from "next";
import NextLink from "next/link";
import type { AuthenticatedUserSummary } from "@/lib/auth-types";
import { AccountMenu } from "@/components/ui/account-menu";
import { AppButtonLink, AppNavLink } from "@/components/ui/primitives";
import { FadeIn, ScaleIn } from "@/components/ui/landing-animations";

const supportPoints = [
  {
    title: "Outline First",
    description:
      "Structure your ideas instantly. See the skeleton before paragraphs resolve.",
  },
  {
    title: "Selection Rewrite",
    description:
      "Highlight a single sentence and refine tone without disrupting the whole draft.",
  },
  {
    title: "Version History",
    description:
      "Roll back to earlier concepts natively. Checkpoints track every major AI action.",
  },
];

const workflow = [
  {
    step: "STEP 1",
    title: "Contextual Grounding",
    description:
      "Upload your PDFs, internal docs, and style guides. The engine grounds every word.",
  },
  {
    step: "STEP 2",
    title: "Progressive Generation",
    description:
      "Watch the blocks stream in. Only valid, structured text enters your final document.",
  },
  {
    step: "STEP 3",
    title: "Live Co-editing",
    description:
      "Edit generated paragraphs while the rest of the draft continues writing below.",
  },
];

const workflowAction = {
  href: "/studio",
  title: "Open the Studio",
  description:
    "Launch a new workspace and start building the draft immediately.",
  label: "Launch workspace",
};

export function Landing({
  user,
  launchHref
}: {
  user: AuthenticatedUserSummary | null;
  launchHref: string;
}) {
  return (
    <main className="min-h-screen text-white selection:bg-[var(--accent-strong)]/20 overflow-hidden font-sans">
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 py-6 border-b border-[var(--border)]/50">
          <AppNavLink
            href="/"
            className="brand-mark text-3xl md:text-4xl text-white hover:opacity-80 transition-opacity"
          >
            Mivo
          </AppNavLink>
          <div className="flex items-center">
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <AppButtonLink
                href={launchHref}
                tone="primary"
                className="h-9 px-4 text-xs tracking-wide"
              >
                Launch App
              </AppButtonLink>
            )}
          </div>
        </header>

        <section className="flex flex-col lg:flex-row items-center justify-between gap-16 py-20 lg:py-32 min-h-[calc(100vh-80px)]">
          <FadeIn className="flex-1 w-full max-w-2xl lg:max-w-none" y={20}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md mb-8">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_8px_var(--accent-strong)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                Next-Gen Editorial
              </span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-[5rem] leading-[1.05] tracking-tight mb-8">
              Draft at the speed of <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--accent-strong)]">
                thought.
              </span>
            </h1>

            <p className="text-lg sm:text-xl leading-relaxed text-[var(--text-muted)] max-w-xl mb-10">
              Transform prompts and source files into structured posts, blogs,
              and landing pages with a cleaner, block-native editing flow.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <AppButtonLink
                href={launchHref}
                tone="primary"
                className="w-full sm:w-auto h-12 px-8 text-sm font-medium shadow-[0_0_20px_rgba(47,223,160,0.2)] hover:shadow-[0_0_30px_rgba(47,223,160,0.3)] transition-all"
              >
                Start Generating
              </AppButtonLink>
            </div>
          </FadeIn>

          <ScaleIn
            className="w-full lg:w-[540px] xl:w-[600px] shrink-0"
            delay={0.1}
          >
            <div className="relative rounded-2xl border border-[var(--border)] bg-[#0A0A0A] shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/50 to-transparent opacity-50" />

              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]/50 bg-[#0F0F0F]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                </div>
                <div className="ml-auto px-2 py-1 rounded bg-[var(--accent)]/20 border border-[var(--accent)]/30 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse" />
                  <span className="text-[9px] uppercase tracking-widest text-[var(--accent-strong)] font-medium">
                    Streaming
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[#141414] transition-colors group-hover:border-[var(--border-strong)]">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-soft)] mb-3 font-semibold">
                    Context Active
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent-strong)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        Product_Launch_Q3.pdf
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Parsed • 14 pages • Key value props
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[#141414]">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-soft)] mb-4 font-semibold">
                    Draft Progression
                  </p>

                  <div className="space-y-5">
                    <div className="relative pl-5">
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-[#333333] border-2 border-[#141414]" />
                      <div className="absolute left-[3px] top-3.5 bottom-[-16px] w-[2px] bg-[#333333]" />
                      <p className="text-sm font-display text-white mb-1">
                        The Opening Hook
                      </p>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Introducing the paradigm shift in AI-native editing
                        interfaces...
                      </p>
                    </div>

                    <div className="relative pl-5">
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-[var(--accent-strong)] border-2 border-[#141414] shadow-[0_0_10px_var(--accent-strong)]" />
                      <div className="absolute left-[3px] top-3.5 bottom-[-16px] w-[2px] bg-gradient-to-b from-[var(--accent-strong)] to-transparent opacity-30" />
                      <p className="text-sm font-display text-white mb-2">
                        Core Mechanics
                      </p>
                      <div className="p-3 rounded border border-dashed border-[var(--accent-strong)]/30 bg-[var(--accent)]/5">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="animate-spin"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--accent-strong)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          <span className="text-[10px] text-[var(--accent-strong)] uppercase tracking-wider">
                            Resolving Block...
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-1.5 w-full bg-[var(--surface-2)] rounded overflow-hidden">
                            <div className="h-full w-2/3 bg-[var(--text-soft)]/20 animate-pulse" />
                          </div>
                          <div className="h-1.5 w-4/5 bg-[var(--surface-2)] rounded overflow-hidden">
                            <div className="h-full w-1/2 bg-[var(--text-soft)]/20 animate-pulse delay-75" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative pl-5 opacity-40">
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-[#333333] border-2 border-[#141414]" />
                      <p className="text-sm font-display text-white">
                        Call to Action
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScaleIn>
        </section>

        <section className="py-24 border-t border-[var(--border)]/50">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {supportPoints.map((point, index) => (
              <div
                key={point.title}
                className="group p-6 rounded-2xl border border-[var(--border)] bg-[#0A0A0A] hover:bg-[#0F0F0F] hover:border-[var(--border-strong)] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-6 text-[var(--accent-strong)] font-mono text-sm group-hover:scale-110 transition-transform">
                  0{index + 1}
                </div>
                <h3 className="font-display text-xl text-white mb-3">
                  {point.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-24 border-t border-[var(--border)]/50">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-1/3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[#0A0A0A] mb-6">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                  Architecture
                </span>
              </div>
              <h2 className="font-display text-4xl lg:text-5xl leading-[1.1] text-white mb-6">
                Engineered for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-strong)] to-[#8af6c5]">
                  flow.
                </span>
              </h2>
              <p className="text-[var(--text-muted)] text-base leading-relaxed">
                A seamless pipeline from unstructured thoughts to published
                assets, without the copy-paste friction.
              </p>
            </div>

            <div className="lg:w-2/3 grid sm:grid-cols-2 gap-6">
              {workflow.map((step) => (
                <div
                  key={step.title}
                  className="p-6 rounded-2xl border border-[var(--border)] bg-[#0A0A0A] flex flex-col"
                >
                  <div className="text-[var(--text-soft)] font-mono text-xs mb-8">
                    {step.step}
                  </div>
                  <h3 className="font-display text-2xl text-white mb-3 mt-auto">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
              <NextLink
                href={workflowAction.href as Route}
                className="group relative flex flex-col p-6 rounded-2xl border border-[var(--border)] bg-[#0A0A0A] overflow-hidden transition-all duration-300 hover:border-[var(--accent-strong)]/50 hover:bg-[#0F0F0F]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-[var(--accent-strong)]/20 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="text-[var(--accent-strong)] font-mono text-xs mb-8 flex items-center gap-2 relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_8px_var(--accent-strong)]" />
                  ACTION
                </div>

                <h3 className="font-display text-2xl text-white mb-3 mt-auto relative z-10 group-hover:text-[var(--accent-strong)] transition-colors">
                  {workflowAction.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed relative z-10">
                  {workflowAction.description}
                </p>
              </NextLink>
            </div>
          </div>
        </section>

        <section className="py-24 mb-12">
          <div className="relative rounded-3xl border border-[var(--border)] bg-gradient-to-b from-[#0A0A0A] to-[#050505] p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-strong)] to-transparent opacity-50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent-strong)]/10 blur-[100px] pointer-events-none rounded-full" />

            <h2 className="relative font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-6 tracking-tight">
              Ready to redefine your draft?
            </h2>
            <p className="relative text-lg text-[var(--text-muted)] max-w-xl mx-auto mb-10">
              Skip the blank page. Let the context drive the structure while you
              shape the narrative in real-time.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppButtonLink
                href={launchHref}
                tone="primary"
                className="h-12 px-8 text-sm font-medium shadow-[0_0_20px_rgba(47,223,160,0.2)]"
              >
                Launch App
              </AppButtonLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
