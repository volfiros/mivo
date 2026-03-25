"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import type { JSONContent } from "@tiptap/core";
import type { ContentType } from "@/lib/schema/content";
import { AppButtonLink, AppNavLink } from "@/components/ui/primitives";

type Variant = {
  canvas: string;
  body: string;
  h1: string;
  h2: string;
  h3: string;
  heroTitle: string;
  heroSubtitle: string;
  sectionSpacing: string;
};

const previewVariants: Record<ContentType, Variant> = {
  social_post: {
    canvas: "mx-auto max-w-3xl",
    body: "text-[1.02rem] leading-8 text-[var(--text)]",
    h1: "text-3xl font-semibold tracking-tight text-white",
    h2: "text-2xl font-semibold tracking-tight text-white",
    h3: "text-xl font-semibold tracking-tight text-white",
    heroTitle: "text-4xl font-semibold tracking-tight text-white sm:text-5xl",
    heroSubtitle: "max-w-2xl text-lg leading-8 text-[var(--text-soft)]",
    sectionSpacing: "mb-8"
  },
  blog_post: {
    canvas: "mx-auto max-w-4xl",
    body: "text-[1.05rem] leading-8 text-[var(--text)]",
    h1: "text-4xl font-semibold tracking-tight text-white sm:text-5xl",
    h2: "text-3xl font-semibold tracking-tight text-white",
    h3: "text-2xl font-semibold tracking-tight text-white",
    heroTitle: "text-5xl font-semibold tracking-tight text-white sm:text-6xl",
    heroSubtitle: "max-w-3xl text-xl leading-8 text-[var(--text-soft)]",
    sectionSpacing: "mb-10"
  },
  landing_page: {
    canvas: "mx-auto max-w-6xl",
    body: "text-[1.02rem] leading-8 text-[var(--text)]",
    h1: "text-5xl font-semibold tracking-tight text-white sm:text-6xl",
    h2: "text-3xl font-semibold tracking-tight text-white sm:text-4xl",
    h3: "text-2xl font-semibold tracking-tight text-white",
    heroTitle: "max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-7xl",
    heroSubtitle: "max-w-2xl text-xl leading-8 text-[var(--text-soft)]",
    sectionSpacing: "mb-12"
  }
};

type RenderNodeProps = {
  node: JSONContent;
  contentType: ContentType;
};

function renderMark(
  type: string,
  content: ReactNode,
  attrs: Record<string, unknown> | undefined,
  key: string
) {
  switch (type) {
    case "bold":
      return (
        <strong key={key} className="font-semibold text-white">
          {content}
        </strong>
      );
    case "italic":
      return (
        <em key={key} className="italic">
          {content}
        </em>
      );
    case "strike":
      return (
        <s key={key} className="opacity-80">
          {content}
        </s>
      );
    case "code":
      return (
        <code
          key={key}
          className="rounded border border-[var(--border)] bg-[#141414] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--accent-strong)]"
        >
          {content}
        </code>
      );
    case "link":
      return (
        <a
          key={key}
          href={typeof attrs?.href === "string" ? attrs.href : "#"}
          className="text-[var(--accent-strong)] underline underline-offset-4"
        >
          {content}
        </a>
      );
    default:
      return content;
  }
}

function renderInline(node: JSONContent, contentType: ContentType, key: string): ReactNode {
  if (!node.type) {
    return null;
  }

  if (node.type === "text") {
    let content: ReactNode = node.text ?? null;

    for (const [index, mark] of (node.marks ?? []).entries()) {
      content = renderMark(mark.type, content, mark.attrs, `${key}-mark-${index}`);
    }

    return <span key={key}>{content}</span>;
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  return <RenderNode key={key} node={node} contentType={contentType} />;
}

function renderChildren(content: JSONContent[] | undefined, contentType: ContentType) {
  return content?.map((child, index) =>
    renderInline(child, contentType, `${child.type ?? "node"}-${index}`)
  );
}

function extractPlainText(content: JSONContent[] | undefined): string {
  return (
    content
      ?.map((node) => {
        if (node.type === "text") {
          return node.text ?? "";
        }

        if (node.type === "hardBreak") {
          return "\n";
        }

        return extractPlainText(node.content);
      })
      .join("") ?? ""
  );
}

function RenderNode({ node, contentType }: RenderNodeProps) {
  if (!node.type) {
    return null;
  }

  const variant = previewVariants[contentType];

  if (node.type === "paragraph") {
    return <p className={`mb-4 ${variant.body}`}>{renderChildren(node.content, contentType)}</p>;
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 2);
    const Tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
    const className =
      level === 1 ? variant.h1 : level === 3 ? variant.h3 : variant.h2;

    return <Tag className={`mb-4 mt-8 ${className}`}>{renderChildren(node.content, contentType)}</Tag>;
  }

  if (node.type === "bulletList") {
    return <ul className="mb-5 list-disc space-y-2 pl-6">{renderChildren(node.content, contentType)}</ul>;
  }

  if (node.type === "orderedList") {
    return <ol className="mb-5 list-decimal space-y-2 pl-6">{renderChildren(node.content, contentType)}</ol>;
  }

  if (node.type === "listItem") {
    return <li className={variant.body}>{renderChildren(node.content, contentType)}</li>;
  }

  if (node.type === "blockquote") {
    return (
      <blockquote className="mb-6 border-l-2 border-[var(--accent-strong)]/60 pl-5 text-[var(--text-soft)]">
        {renderChildren(node.content, contentType)}
      </blockquote>
    );
  }

  if (node.type === "horizontalRule") {
    return <hr className="my-8 border-[var(--border)]" />;
  }

  if (node.type === "codeBlock") {
    return (
      <pre className="mb-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[#101010] p-4 text-sm leading-7 text-[#d7dfdb]">
        <code>{extractPlainText(node.content)}</code>
      </pre>
    );
  }

  if (node.type === "heroSection") {
    const eyebrow =
      typeof node.attrs?.eyebrow === "string" ? node.attrs.eyebrow.trim() : "";

    return (
      <section className={`${variant.sectionSpacing} border-b border-[var(--border)] pb-10`}>
        {eyebrow ? (
          <p className="mb-4 text-sm font-medium text-[var(--text-soft)]">{eyebrow}</p>
        ) : null}
        <h1 className={variant.heroTitle}>{node.attrs?.title}</h1>
        {node.attrs?.subtitle ? (
          <p className={`mt-5 ${variant.heroSubtitle}`}>{node.attrs.subtitle}</p>
        ) : null}
        {node.attrs?.actionLabel ? (
          <div className="mt-6">
            <span className="inline-flex rounded-md border border-[var(--border)] bg-[#141414] px-4 py-2 text-sm text-white">
              {node.attrs.actionLabel}
            </span>
          </div>
        ) : null}
      </section>
    );
  }

  if (node.type === "twoColumn") {
    return (
      <section className={`${variant.sectionSpacing} grid gap-6 border-t border-[var(--border)] pt-8 md:grid-cols-2`}>
        <div>
          <h2 className="mb-3 text-2xl font-semibold text-white">{node.attrs?.leftTitle}</h2>
          <p className={variant.body}>{node.attrs?.leftBody}</p>
        </div>
        <div>
          <h2 className="mb-3 text-2xl font-semibold text-white">{node.attrs?.rightTitle}</h2>
          <p className={variant.body}>{node.attrs?.rightBody}</p>
        </div>
      </section>
    );
  }

  if (node.type === "imageWithCopy") {
    const imageUrl =
      typeof node.attrs?.imageUrl === "string" ? node.attrs.imageUrl.trim() : "";

    return (
      <section className={`${variant.sectionSpacing} grid gap-6 border-t border-[var(--border)] pt-8 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:items-start`}>
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#121212]">
          {imageUrl ? (
            <div
              aria-label={typeof node.attrs?.title === "string" ? node.attrs.title : "Preview image"}
              className="min-h-[220px] bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className="flex min-h-[220px] items-center justify-center px-6 text-sm text-[var(--text-soft)]">
              Image placeholder
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white">
            {node.attrs?.title}
          </h2>
          <p className={variant.body}>{node.attrs?.body}</p>
        </div>
      </section>
    );
  }

  if (node.type === "calloutBlock") {
    return (
      <aside className={`${variant.sectionSpacing} border-l-2 border-[var(--accent-strong)]/70 pl-5`}>
        <p className="mb-2 text-sm font-medium text-[var(--accent-strong)]">{node.attrs?.label}</p>
        <p className="text-xl leading-8 text-white">{node.attrs?.body}</p>
      </aside>
    );
  }

  if (node.type === "quoteBlock") {
    return (
        <blockquote className={`${variant.sectionSpacing} border-t border-b border-[var(--border)] py-8`}>
        <p className="text-3xl font-medium leading-tight text-white sm:text-4xl">
          &quot;{node.attrs?.quote}&quot;
        </p>
        <p className="mt-4 text-sm text-[var(--text-soft)]">{node.attrs?.attribution}</p>
      </blockquote>
    );
  }

  if (node.type === "ctaBanner") {
    return (
      <section className={`${variant.sectionSpacing} rounded-xl border border-[var(--border)] bg-[#121212] px-6 py-8`}>
        <h2 className="text-3xl font-semibold tracking-tight text-white">{node.attrs?.title}</h2>
        <p className={`mt-4 ${variant.body}`}>{node.attrs?.body}</p>
        {node.attrs?.actionLabel ? (
          <div className="mt-6">
            <span className="inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
              {node.attrs.actionLabel}
            </span>
          </div>
        ) : null}
      </section>
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
      <section className={`${variant.sectionSpacing} grid gap-4 md:grid-cols-2`}>
        {items.map(([title, body], index) => (
          <div key={`${String(title)}-${index}`} className="rounded-xl border border-[var(--border)] px-5 py-6">
            <p className="mb-3 text-sm font-medium text-[var(--text-soft)]">{index + 1}</p>
            <h3 className="mb-3 text-2xl font-semibold tracking-tight text-white">{title}</h3>
            <p className={variant.body}>{body}</p>
          </div>
        ))}
      </section>
    );
  }

  if (node.type === "doc") {
    return <>{renderChildren(node.content, contentType)}</>;
  }

  return null;
}

export function DocumentPreview({
  content,
  contentType,
  documentId,
  title,
  versionLabel
}: {
  content: JSONContent;
  contentType: ContentType;
  documentId: string;
  title: string;
  versionLabel?: string | null;
}) {
  const variant = previewVariants[contentType];

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-10 flex flex-col gap-5 border-b border-[var(--border)] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <AppNavLink href="/" className="brand-mark text-3xl text-white">
              Mivo
            </AppNavLink>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {contentType.replace(/_/g, " ")}
              {versionLabel ? ` • ${versionLabel}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
              New Document
            </AppButtonLink>
          </div>
        </header>
        <article className={variant.canvas}>
          <RenderNode node={content} contentType={contentType} />
        </article>
      </div>
    </main>
  );
}
