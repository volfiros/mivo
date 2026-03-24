"use client";

import type { Route } from "next";
import type { JSONContent } from "@tiptap/core";
import { AppButtonLink, AppNavLink, AppPanel } from "@/components/ui/primitives";

function RenderNode({ node }: { node: JSONContent }) {
  if (!node.type) {
    return null;
  }

  if (node.type === "text") {
    return node.text ?? null;
  }

  if (node.type === "paragraph") {
    return <p className="prose-block text-base leading-8 text-[var(--text)]">{node.content?.map((child, index) => <RenderNode key={index} node={child} />)}</p>;
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 2);
    const Tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
    const className = level === 1 ? "font-display mb-5 text-5xl leading-[0.92]" : "font-display mb-4 mt-8 text-3xl";
    return <Tag className={className}>{node.content?.map((child, index) => <RenderNode key={index} node={child} />)}</Tag>;
  }

  if (node.type === "heroSection") {
    return (
      <AppPanel className="mb-8 p-8">
        <p className="mb-4 text-xs uppercase tracking-[0.32em] text-[var(--text-soft)]">{node.attrs?.eyebrow}</p>
        <h1 className="font-display text-5xl leading-[0.9] md:text-6xl">{node.attrs?.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-muted)]">{node.attrs?.subtitle}</p>
        <div className="mt-8">
          <AppButtonLink href="/studio/new" tone="primary" size="3">
            {node.attrs?.actionLabel || "Learn more"}
          </AppButtonLink>
        </div>
      </AppPanel>
    );
  }

  if (node.type === "twoColumn") {
    return (
      <AppPanel className="mb-8 grid gap-8 p-8 md:grid-cols-2">
        <div>
          <h2 className="font-display mb-4 text-3xl">{node.attrs?.leftTitle}</h2>
          <p className="text-sm leading-7 text-[var(--text-muted)]">{node.attrs?.leftBody}</p>
        </div>
        <div>
          <h2 className="font-display mb-4 text-3xl">{node.attrs?.rightTitle}</h2>
          <p className="text-sm leading-7 text-[var(--text-muted)]">{node.attrs?.rightBody}</p>
        </div>
      </AppPanel>
    );
  }

  if (node.type === "imageWithCopy") {
    return (
      <AppPanel className="mb-8 grid gap-8 p-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] px-4 text-center text-sm text-[var(--text-soft)]">
          {node.attrs?.imageUrl || "Image"}
        </div>
        <div>
          <h2 className="font-display mb-4 text-4xl">{node.attrs?.title}</h2>
          <p className="text-sm leading-7 text-[var(--text-muted)]">{node.attrs?.body}</p>
        </div>
      </AppPanel>
    );
  }

  if (node.type === "calloutBlock") {
    return (
      <AppPanel className="mb-8 p-8">
        <p className="mb-4 text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">{node.attrs?.label}</p>
        <p className="font-display text-4xl leading-tight">{node.attrs?.body}</p>
      </AppPanel>
    );
  }

  if (node.type === "quoteBlock") {
    return (
      <AppPanel className="mb-8 p-8">
        <p className="font-display text-5xl leading-tight">{node.attrs?.quote}</p>
        <p className="mt-5 text-sm text-[var(--text-soft)]">{node.attrs?.attribution}</p>
      </AppPanel>
    );
  }

  if (node.type === "ctaBanner") {
    return (
      <AppPanel className="mb-8 flex flex-col gap-6 p-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display mb-4 text-4xl">{node.attrs?.title}</h2>
          <p className="text-sm leading-7 text-[var(--text-muted)]">{node.attrs?.body}</p>
        </div>
        <div>
          <AppButtonLink href="/studio/new" tone="primary" size="3">
            {node.attrs?.actionLabel || "Continue"}
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
      [node.attrs?.item4Title, node.attrs?.item4Body]
    ].filter(([title, body]) => title || body);

    return (
      <section className="mb-8 grid gap-4 md:grid-cols-2">
        {items.map(([title, body], index) => (
          <AppPanel key={`${title}-${index}`} className="p-6">
            <h2 className="font-display mb-3 text-3xl">{title}</h2>
            <p className="text-sm leading-7 text-[var(--text-muted)]">{body}</p>
          </AppPanel>
        ))}
      </section>
    );
  }

  if (node.type === "doc") {
    return <>{node.content?.map((child, index) => <RenderNode key={index} node={child} />)}</>;
  }

  return null;
}

export function DocumentPreview({ content, documentId }: { content: JSONContent; documentId: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-10">
      <div className="mb-10 flex items-center justify-between gap-4">
        <AppNavLink href="/" className="brand-mark text-[2.25rem] text-[var(--text)]">
          mivo
        </AppNavLink>
        <div className="flex flex-wrap gap-3">
          <AppButtonLink href={`/studio/${documentId}` as Route} tone="secondary" size="3">
            Back to Studio
          </AppButtonLink>
          <AppButtonLink href="/studio/new" tone="ghost" size="3">
            Start Another
          </AppButtonLink>
        </div>
      </div>
      <div className="mx-auto max-w-5xl">
        <RenderNode node={content} />
      </div>
    </main>
  );
}
