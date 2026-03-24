"use client";

import type { Route } from "next";
import type { JSONContent } from "@tiptap/core";
import {
  AppButtonLink,
  AppNavLink,
  AppPanel,
} from "@/components/ui/primitives";

function RenderNode({ node }: { node: JSONContent }) {
  if (!node.type) {
    return null;
  }

  if (node.type === "text") {
    return node.text ?? null;
  }

  if (node.type === "paragraph") {
    return (
      <p className="prose-block text-base leading-8 text-[var(--text)]">
        {node.content?.map((child, index) => (
          <RenderNode key={index} node={child} />
        ))}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 2);
    const Tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
    const className =
      level === 1
        ? "font-display mb-5 text-5xl leading-[0.92]"
        : "font-display mb-4 mt-8 text-3xl";
    return (
      <Tag className={className}>
        {node.content?.map((child, index) => (
          <RenderNode key={index} node={child} />
        ))}
      </Tag>
    );
  }

  if (node.type === "heroSection") {
    return (
      <AppPanel className="mb-12 p-10 md:p-14 text-center flex flex-col items-center border border-[var(--border)] bg-gradient-to-b from-[#141414] to-[#0A0A0A]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/50 mb-6">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            {node.attrs?.eyebrow || "Hero Block"}
          </span>
        </div>
        <h1 className="font-display text-5xl leading-[1.05] md:text-7xl tracking-tight mb-6">
          {node.attrs?.title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[var(--text-muted)] mb-10">
          {node.attrs?.subtitle}
        </p>
        <AppButtonLink
          href="/studio/new"
          tone="primary"
          size="3"
          className="px-8 h-12"
        >
          {node.attrs?.actionLabel || "Engage Module"}
        </AppButtonLink>
      </AppPanel>
    );
  }

  if (node.type === "twoColumn") {
    return (
      <AppPanel className="mb-12 grid gap-8 p-10 md:grid-cols-2 border border-[var(--border)] bg-[#0A0A0A]">
        <div className="p-6 rounded-xl border border-[var(--border)]/50 bg-[#141414]">
          <h2 className="font-display mb-4 text-2xl text-white">
            {node.attrs?.leftTitle}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {node.attrs?.leftBody}
          </p>
        </div>
        <div className="p-6 rounded-xl border border-[var(--border)]/50 bg-[#141414]">
          <h2 className="font-display mb-4 text-2xl text-white">
            {node.attrs?.rightTitle}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {node.attrs?.rightBody}
          </p>
        </div>
      </AppPanel>
    );
  }

  if (node.type === "imageWithCopy") {
    return (
      <AppPanel className="mb-12 grid gap-10 p-10 md:grid-cols-[300px_minmax(0,1fr)] items-center border border-[var(--border)] bg-[#0A0A0A]">
        <div className="flex min-h-[300px] w-full items-center justify-center rounded-2xl border border-dashed border-[var(--accent-strong)]/30 bg-[var(--accent)]/5 px-4 text-center text-[10px] uppercase tracking-widest text-[var(--accent-strong)] relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          {node.attrs?.imageUrl || "Visual Asset Placeholder"}
        </div>
        <div>
          <h2 className="font-display mb-6 text-4xl leading-tight text-white">
            {node.attrs?.title}
          </h2>
          <p className="text-base leading-relaxed text-[var(--text-muted)]">
            {node.attrs?.body}
          </p>
        </div>
      </AppPanel>
    );
  }

  if (node.type === "calloutBlock") {
    return (
      <AppPanel className="mb-12 p-8 border border-[var(--accent-strong)]/30 bg-[var(--accent)]/5 flex gap-6 items-start">
        <div className="shrink-0 p-3 rounded-xl bg-[#141414] border border-[var(--border)]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-strong)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            {node.attrs?.label}
          </p>
          <p className="font-display text-2xl leading-snug text-white/90">
            {node.attrs?.body}
          </p>
        </div>
      </AppPanel>
    );
  }

  if (node.type === "quoteBlock") {
    return (
      <AppPanel className="mb-12 p-12 text-center border-none bg-gradient-to-b from-[#141414] to-[#0A0A0A] relative overflow-hidden">
        <div className="absolute -top-10 -left-10 text-[120px] text-[var(--surface-2)] font-serif leading-none select-none">
          &quot;
        </div>
        <p className="relative font-display text-4xl md:text-5xl leading-tight text-white mb-8">
          &quot;{node.attrs?.quote}&quot;
        </p>
        <div className="relative inline-flex items-center gap-3">
          <div className="h-px w-8 bg-[var(--accent-strong)]/50" />
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-soft)]">
            {node.attrs?.attribution}
          </p>
          <div className="h-px w-8 bg-[var(--accent-strong)]/50" />
        </div>
      </AppPanel>
    );
  }

  if (node.type === "ctaBanner") {
    return (
      <AppPanel className="mb-12 flex flex-col gap-8 p-12 text-center items-center border border-[var(--border)] bg-[#0A0A0A] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-strong)] to-transparent opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[var(--accent-strong)]/5 blur-[80px] pointer-events-none rounded-full" />
        <div className="max-w-2xl relative z-10">
          <h2 className="font-display mb-4 text-4xl md:text-5xl tracking-tight text-white">
            {node.attrs?.title}
          </h2>
          <p className="text-lg leading-relaxed text-[var(--text-muted)] mb-8">
            {node.attrs?.body}
          </p>
          <AppButtonLink
            href="/studio/new"
            tone="primary"
            size="3"
            className="px-8 h-12 shadow-[0_0_20px_rgba(47,223,160,0.15)]"
          >
            {node.attrs?.actionLabel || "Initialize Sequence"}
          </AppButtonLink>
        </div>
      </AppPanel>
    );
  }

  if (node.type === "featureGrid") {
    const items = [
      [node.attrs?.item1Title, node.attrs?.item1Body],
      [node.attrs?.item2Title, node.attrs?.item2Body],
      [node.attrs?.item3Title, node.attrs?.item3Body],
      [node.attrs?.item4Title, node.attrs?.item4Body],
    ].filter(([title, body]) => title || body);

    return (
      <section className="mb-12 grid gap-6 md:grid-cols-2">
        {items.map(([title, body], index) => (
          <AppPanel
            key={`${title}-${index}`}
            className="p-8 border border-[var(--border)] bg-[#0A0A0A] hover:bg-[#0F0F0F] transition-colors group"
          >
            <div className="w-8 h-8 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-6 text-[var(--accent-strong)] font-mono text-xs group-hover:scale-110 transition-transform">
              0{index + 1}
            </div>
            <h2 className="font-display mb-3 text-2xl text-white">{title}</h2>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {body}
            </p>
          </AppPanel>
        ))}
      </section>
    );
  }

  if (node.type === "doc") {
    return (
      <>
        {node.content?.map((child, index) => (
          <RenderNode key={index} node={child} />
        ))}
      </>
    );
  }

  return null;
}

export function DocumentPreview({
  content,
  documentId,
}: {
  content: JSONContent;
  documentId: string;
}) {
  return (
    <main className="min-h-screen text-white overflow-hidden relative font-sans py-10">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <header className="flex items-center justify-between py-6 border-b border-[var(--border)]/50 mb-12">
          <AppNavLink
            href="/"
            className="brand-mark text-3xl md:text-4xl text-white hover:opacity-80 transition-opacity"
          >
            Mivo
          </AppNavLink>
          <div className="flex flex-wrap gap-4">
            <AppButtonLink
              href={`/studio/${documentId}` as Route}
              tone="secondary"
              size="3"
              className="text-xs"
            >
              Back to Canvas
            </AppButtonLink>
            <AppButtonLink
              href="/studio/new"
              tone="primary"
              size="3"
              className="text-xs"
            >
              Initialize New
            </AppButtonLink>
          </div>
        </header>
        <div className="mx-auto max-w-5xl bg-[#0A0A0A]/80 border border-[var(--border)]/50 rounded-2xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
          <RenderNode node={content} />
        </div>
      </div>
    </main>
  );
}
