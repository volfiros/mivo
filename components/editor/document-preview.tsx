"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import type { JSONContent } from "@tiptap/core";
import { clsx } from "clsx";
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
    h1: "text-5xl font-semibold tracking-tight text-white sm:text-7xl",
    h2: "text-[1.85rem] font-semibold tracking-tight text-white",
    h3: "text-[1.2rem] font-semibold tracking-tight text-white",
    heroTitle: "max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-7xl",
    heroSubtitle: "max-w-2xl text-xl leading-8 text-[var(--text-soft)]",
    sectionSpacing: "mb-12"
  }
};

type RenderNodeProps = {
  node: JSONContent;
  contentType: ContentType;
};

const sectionLabelClass =
  "border-b border-[var(--border)] pb-2 text-[0.78rem] font-medium text-[var(--text-soft)]";
const structuredTitleClass = "text-[1.15rem] font-semibold leading-7 text-white";
const structuredBodyClass = "text-[0.98rem] leading-7 text-[var(--text-soft)]";

function landingSectionPreviewClass(variant: string) {
  switch (variant) {
    case "hero":
      return clsx(
        "space-y-6 border-t border-[var(--border)] pt-8",
        "[&>p:first-child]:max-w-[10rem] [&>p:first-child]:text-[0.82rem] [&>p:first-child]:font-medium [&>p:first-child]:uppercase [&>p:first-child]:tracking-[0.22em] [&>p:first-child]:text-[var(--text-soft)]",
        "[&>h1]:max-w-4xl [&>h1]:text-5xl [&>h1]:font-semibold [&>h1]:leading-[1.02] [&>h1]:tracking-tight [&>h1]:text-white sm:[&>h1]:text-7xl",
        "[&>p:nth-of-type(2)]:max-w-2xl [&>p:nth-of-type(2)]:text-[1.08rem] [&>p:nth-of-type(2)]:leading-8 [&>p:nth-of-type(2)]:text-[var(--text-soft)]",
        "[&>p:last-child]:inline-flex [&>p:last-child]:w-fit [&>p:last-child]:border [&>p:last-child]:border-[rgba(66,230,164,0.28)] [&>p:last-child]:px-4 [&>p:last-child]:py-2 [&>p:last-child]:text-sm [&>p:last-child]:font-semibold [&>p:last-child]:tracking-[0.06em] [&>p:last-child]:text-white",
      );
    case "feature-grid":
      return "grid gap-5 border-t border-[var(--border)] pt-8 md:grid-cols-2";
    case "two-column":
      return "grid gap-8 border-t border-[var(--border)] pt-8 md:grid-cols-2";
    case "image-with-copy":
      return "grid gap-8 border-t border-[var(--border)] pt-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center";
    case "quote":
      return clsx(
        "space-y-4 border-t border-[var(--border)] pt-8",
        "[&>blockquote]:border-l-2 [&>blockquote]:border-[var(--accent-strong)]/40 [&>blockquote]:pl-6 [&>blockquote>p]:text-[1.22rem] [&>blockquote>p]:leading-9 [&>blockquote>p]:text-white",
        "[&>p]:text-[1rem] [&>p]:font-semibold [&>p]:tracking-tight [&>p]:text-[var(--text-soft)]",
      );
    case "cta":
      return clsx(
        "space-y-4 border-t border-[var(--border)] pt-8",
        "[&>.landing-cta-shell]:space-y-4 [&>.landing-cta-shell]:border [&>.landing-cta-shell]:border-[rgba(66,230,164,0.18)] [&>.landing-cta-shell]:bg-[rgba(17,31,24,0.65)] [&>.landing-cta-shell]:px-6 [&>.landing-cta-shell]:py-6",
        "[&>.landing-cta-shell>h2]:text-[1.8rem] [&>.landing-cta-shell>h2]:font-semibold [&>.landing-cta-shell>h2]:tracking-tight [&>.landing-cta-shell>h2]:text-white",
        "[&>.landing-cta-shell>p:first-of-type]:max-w-3xl [&>.landing-cta-shell>p:first-of-type]:text-[1rem] [&>.landing-cta-shell>p:first-of-type]:leading-8 [&>.landing-cta-shell>p:first-of-type]:text-[var(--text-soft)]",
        "[&>.landing-cta-shell>p:last-child]:text-[1rem] [&>.landing-cta-shell>p:last-child]:font-semibold [&>.landing-cta-shell>p:last-child]:text-white",
      );
    case "callout":
      return clsx(
        "border-t border-[var(--border)] pt-8",
        "[&>.landing-callout-shell]:space-y-4 [&>.landing-callout-shell]:border-l-2 [&>.landing-callout-shell]:border-[var(--accent-strong)]/45 [&>.landing-callout-shell]:pl-6",
        "[&>.landing-callout-shell>h3]:text-[1.25rem] [&>.landing-callout-shell>h3]:font-semibold [&>.landing-callout-shell>h3]:tracking-tight [&>.landing-callout-shell>h3]:text-white",
        "[&>.landing-callout-shell>p]:text-[1rem] [&>.landing-callout-shell>p]:leading-8 [&>.landing-callout-shell>p]:text-[var(--text-soft)]",
      );
    default:
      return clsx(
        "space-y-4 border-t border-[var(--border)] pt-8",
        "[&>h2]:text-[1.85rem] [&>h2]:font-semibold [&>h2]:tracking-tight [&>h2]:text-white",
        "[&>h3]:text-[1.2rem] [&>h3]:font-semibold [&>h3]:tracking-tight [&>h3]:text-white",
        "[&>p]:text-[1rem] [&>p]:leading-8 [&>p]:text-[var(--text-soft)]",
      );
  }
}

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

function ensureText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback.trim();
}

function RenderNode({ node, contentType }: RenderNodeProps) {
  if (!node.type) {
    return null;
  }

  const variant = previewVariants[contentType];

  if (node.type === "landingSection") {
    const sectionLabel = ensureText(node.attrs?.label, "Section");
    const sectionVariant = ensureText(node.attrs?.variant, "text");
    const renderedChildren = renderChildren(node.content, contentType);

    return (
      <section className={variant.sectionSpacing}>
        <div className="mb-5 text-[0.78rem] font-medium tracking-[0.18em] text-[var(--text-soft)]">
          {sectionLabel}
        </div>
        {sectionVariant === "cta" ? (
          <div className={landingSectionPreviewClass(sectionVariant)}>
            <div className="landing-cta-shell">{renderedChildren}</div>
          </div>
        ) : sectionVariant === "callout" ? (
          <div className={landingSectionPreviewClass(sectionVariant)}>
            <div className="landing-callout-shell">{renderedChildren}</div>
          </div>
        ) : (
          <div className={landingSectionPreviewClass(sectionVariant)}>
            {renderedChildren}
          </div>
        )}
      </section>
    );
  }

  if (node.type === "landingColumn") {
    return <div className="min-w-0">{renderChildren(node.content, contentType)}</div>;
  }

  if (node.type === "landingFeatureCard") {
    return (
      <div className="border border-[var(--border)] bg-[rgba(15,15,15,0.82)] px-5 py-5">
        {renderChildren(node.content, contentType)}
      </div>
    );
  }

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

  if (node.type === "sectionHeader") {
    return (
      <div className="mb-4 mt-8">
        <div className={sectionLabelClass}>
          {ensureText(node.attrs?.label, "Section")}
        </div>
      </div>
    );
  }

  if (node.type === "generatedImage") {
    const src = ensureText(node.attrs?.src);
    const alt = ensureText(node.attrs?.alt, "Generated image");

    return (
      <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[#121212]">
        {src ? (
          <div
            role="img"
            aria-label={alt}
            className="min-h-[220px] w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${src})`, minHeight: 220, maxHeight: 520 }}
          />
        ) : (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-sm text-[var(--text-soft)]">
            Image placeholder
          </div>
        )}
      </div>
    );
  }

  if (node.type === "heroSection") {
    const sectionLabel = ensureText(node.attrs?.sectionLabel, "Hero");
    const eyebrow = ensureText(node.attrs?.eyebrow, sectionLabel);
    const title = ensureText(node.attrs?.title, sectionLabel);
    const subtitle = ensureText(
      node.attrs?.subtitle,
      "Supporting copy unavailable.",
    );
    const actionLabel = ensureText(node.attrs?.actionLabel, "Learn more");

    return (
      <section className={`${variant.sectionSpacing} border-b border-[var(--border)] pb-10`}>
        {eyebrow ? (
          <p className="mb-3 text-[0.98rem] font-medium leading-7 text-[var(--text-soft)]">{eyebrow}</p>
        ) : null}
        <h1 className={structuredTitleClass}>{title}</h1>
        <p className={`mt-3 ${structuredBodyClass}`}>{subtitle}</p>
        <p className="mt-4 text-[0.98rem] font-semibold leading-7 text-white">{actionLabel}</p>
      </section>
    );
  }

  if (node.type === "twoColumn") {
    const sectionLabel = ensureText(node.attrs?.sectionLabel, "Two Column");
    const leftTitle = ensureText(node.attrs?.leftTitle, `${sectionLabel} left`);
    const leftBody = ensureText(
      node.attrs?.leftBody,
      "Supporting copy unavailable.",
    );
    const rightTitle = ensureText(node.attrs?.rightTitle, `${sectionLabel} right`);
    const rightBody = ensureText(
      node.attrs?.rightBody,
      "Supporting copy unavailable.",
    );

    return (
      <section className={`${variant.sectionSpacing} grid gap-6 border-t border-[var(--border)] pt-8 md:grid-cols-2`}>
        <div>
          <h2 className={structuredTitleClass}>{leftTitle}</h2>
          <p className={`mt-3 ${structuredBodyClass}`}>{leftBody}</p>
        </div>
        <div>
          <h2 className={structuredTitleClass}>{rightTitle}</h2>
          <p className={`mt-3 ${structuredBodyClass}`}>{rightBody}</p>
        </div>
      </section>
    );
  }

  if (node.type === "imageWithCopy") {
    const sectionLabel = ensureText(node.attrs?.sectionLabel, "Image With Copy");
    const imageUrl = ensureText(node.attrs?.imageUrl);
    const title = ensureText(node.attrs?.title, sectionLabel);
    const body = ensureText(node.attrs?.body, "Supporting copy unavailable.");

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
          <h2 className={structuredTitleClass}>{title}</h2>
          <p className={`mt-3 ${structuredBodyClass}`}>{body}</p>
        </div>
      </section>
    );
  }

  if (node.type === "calloutBlock") {
    const sectionLabel = ensureText(node.attrs?.sectionLabel, "Callout");
    const label = ensureText(node.attrs?.label, sectionLabel);
    const body = ensureText(node.attrs?.body, "Supporting copy unavailable.");

    return (
      <aside className={`${variant.sectionSpacing} border-l-2 border-[var(--accent-strong)]/70 pl-5`}>
        <p className={structuredTitleClass}>{label}</p>
        <p className={`mt-3 ${structuredBodyClass}`}>{body}</p>
      </aside>
    );
  }

  if (node.type === "quoteBlock") {
    const sectionLabel = ensureText(node.attrs?.sectionLabel, "Quote");
    const quote = ensureText(node.attrs?.quote, "Quote unavailable.");
    const attribution = ensureText(node.attrs?.attribution, sectionLabel);

    return (
        <blockquote className={`${variant.sectionSpacing} border-t border-b border-[var(--border)] py-8`}>
        <p className={structuredBodyClass}>
          &quot;{quote}&quot;
        </p>
        <p className={`mt-3 ${structuredTitleClass}`}>{attribution}</p>
      </blockquote>
    );
  }

  if (node.type === "ctaBanner") {
    const sectionLabel = ensureText(node.attrs?.sectionLabel, "CTA");
    const title = ensureText(node.attrs?.title, sectionLabel);
    const body = ensureText(node.attrs?.body, "Take the next step.");
    const actionLabel = ensureText(node.attrs?.actionLabel, "Learn more");

    return (
      <section className={`${variant.sectionSpacing} rounded-xl border border-[var(--border)] bg-[#121212] px-6 py-8`}>
        <h2 className={structuredTitleClass}>{title}</h2>
        <p className={`mt-3 ${structuredBodyClass}`}>{body}</p>
        <p className="mt-4 text-[0.98rem] font-medium leading-7 text-white">{actionLabel}</p>
      </section>
    );
  }

  if (node.type === "featureGrid") {
    const items = [
      [ensureText(node.attrs?.item1Title), ensureText(node.attrs?.item1Body)],
      [ensureText(node.attrs?.item2Title), ensureText(node.attrs?.item2Body)],
      [ensureText(node.attrs?.item3Title), ensureText(node.attrs?.item3Body)],
      [ensureText(node.attrs?.item4Title), ensureText(node.attrs?.item4Body)]
    ].filter(([title, body]) => title || body);

    const sectionLabel = ensureText(node.attrs?.sectionLabel, "Feature Grid");
    const displayItems = items.length
      ? items
      : [
          [`${sectionLabel} 1`, "Supporting copy unavailable."],
          [`${sectionLabel} 2`, "Supporting copy unavailable."],
        ];

    return (
      <section className={`${variant.sectionSpacing} grid gap-4 md:grid-cols-2`}>
        {displayItems.map(([title, body], index) => (
          <div key={`${String(title)}-${index}`} className="rounded-xl border border-[var(--border)] px-5 py-6">
            <h3 className={structuredTitleClass}>{title}</h3>
            <p className={`mt-3 ${structuredBodyClass}`}>{body}</p>
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
