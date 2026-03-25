"use client";

import type { ReactNode } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { clsx } from "clsx";
import { AppPanel } from "@/components/ui/primitives";

type BlockProps = {
  node: { attrs: Record<string, string> };
  updateAttributes: (attributes: Record<string, string>) => void;
  selected: boolean;
};

function ensureText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback.trim();
}

function splitSections(preview: string) {
  return preview
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

const titleClass = "text-[1.15rem] font-semibold leading-7 text-white";
const bodyClass = "text-[0.98rem] leading-7 text-[var(--text-soft)]";

function SectionBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 border-b border-[var(--border)] pb-2 text-[0.78rem] font-medium text-[var(--text-soft)]">
      {children}
    </div>
  );
}

function BlockShell({
  selected,
  children,
}: {
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <NodeViewWrapper className="my-5">
      <AppPanel
        className={clsx(
          "rounded-[10px] p-5 transition",
          selected
            ? "!border-[rgba(66,230,164,0.45)]"
            : "",
        )}
      >
        {children}
      </AppPanel>
    </NodeViewWrapper>
  );
}

function SectionHeaderView({
  node,
  selected,
}: Pick<BlockProps, "node" | "selected">) {
  const label = ensureText(node.attrs.label, "Section");

  return (
    <NodeViewWrapper className="mb-4 mt-6">
      <div
        className={clsx(
          "border-b border-[var(--border)] pb-2 text-[0.78rem] font-medium text-[var(--text-soft)] transition",
          selected
            ? "border-[rgba(66,230,164,0.45)]"
            : "",
        )}
      >
        {label}
      </div>
    </NodeViewWrapper>
  );
}

function HeroSectionView({ node, selected }: BlockProps) {
  const title = ensureText(node.attrs.title, node.attrs.sectionLabel || "Hero");
  const subtitle = ensureText(node.attrs.subtitle, "Supporting copy unavailable.");
  const actionLabel = ensureText(node.attrs.actionLabel, "Learn more");

  return (
    <BlockShell selected={selected}>
      <h2 className={titleClass}>{title}</h2>
      <p className={`mt-3 ${bodyClass}`}>{subtitle}</p>
      <p className="mt-4 text-[0.98rem] font-medium leading-7 text-white">{actionLabel}</p>
    </BlockShell>
  );
}

function TwoColumnView({ node, selected }: BlockProps) {
  const leftTitle = ensureText(node.attrs.leftTitle, `${node.attrs.sectionLabel || "Positioning"} left`);
  const leftBody = ensureText(node.attrs.leftBody, "Supporting copy unavailable.");
  const rightTitle = ensureText(node.attrs.rightTitle, `${node.attrs.sectionLabel || "Positioning"} right`);
  const rightBody = ensureText(node.attrs.rightBody, "Supporting copy unavailable.");

  return (
    <BlockShell selected={selected}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className={titleClass}>{leftTitle}</h3>
          <p className={`mt-3 ${bodyClass}`}>{leftBody}</p>
        </div>
        <div>
          <h3 className={titleClass}>{rightTitle}</h3>
          <p className={`mt-3 ${bodyClass}`}>{rightBody}</p>
        </div>
      </div>
    </BlockShell>
  );
}

function ImageWithCopyView({ node, selected }: BlockProps) {
  const imageUrl = ensureText(node.attrs.imageUrl);
  const title = ensureText(node.attrs.title, node.attrs.sectionLabel || "Visual");
  const body = ensureText(node.attrs.body, "Supporting copy unavailable.");

  return (
    <BlockShell selected={selected}>
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex min-h-[180px] items-center justify-center rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] px-4 text-center text-sm text-[var(--text-soft)]">
          {imageUrl || "Image placeholder"}
        </div>
        <div>
          <h3 className={titleClass}>{title}</h3>
          <p className={`mt-3 ${bodyClass}`}>{body}</p>
        </div>
      </div>
    </BlockShell>
  );
}

function CalloutView({ node, selected }: BlockProps) {
  const label = ensureText(node.attrs.label, node.attrs.sectionLabel || "Callout");
  const body = ensureText(node.attrs.body, "Supporting copy unavailable.");

  return (
    <BlockShell selected={selected}>
      <h3 className={titleClass}>{label}</h3>
      <p className={`mt-3 ${bodyClass}`}>{body}</p>
    </BlockShell>
  );
}

function QuoteView({ node, selected }: BlockProps) {
  const quote = ensureText(node.attrs.quote, "Quote unavailable.");
  const attribution = ensureText(node.attrs.attribution, node.attrs.sectionLabel || "Quote");

  return (
    <BlockShell selected={selected}>
      <blockquote className="border-l border-[var(--border)] pl-4">
        <p className={bodyClass}>&quot;{quote}&quot;</p>
        <p className={`mt-3 ${titleClass}`}>{attribution}</p>
      </blockquote>
    </BlockShell>
  );
}

function CtaBannerView({ node, selected }: BlockProps) {
  const title = ensureText(node.attrs.title, node.attrs.sectionLabel || "CTA");
  const body = ensureText(node.attrs.body, "Take the next step.");
  const actionLabel = ensureText(node.attrs.actionLabel, "Learn more");

  return (
    <BlockShell selected={selected}>
      <h3 className={titleClass}>{title}</h3>
      <p className={`mt-3 ${bodyClass}`}>{body}</p>
      <p className="mt-4 text-[0.98rem] font-medium leading-7 text-white">{actionLabel}</p>
    </BlockShell>
  );
}

function FeatureGridView({ node, selected }: BlockProps) {
  const sectionLabel = ensureText(node.attrs.sectionLabel, "Features");
  const items = [
    [
      ensureText(node.attrs.item1Title),
      ensureText(node.attrs.item1Body),
    ],
    [
      ensureText(node.attrs.item2Title),
      ensureText(node.attrs.item2Body),
    ],
    [
      ensureText(node.attrs.item3Title),
      ensureText(node.attrs.item3Body),
    ],
    [
      ensureText(node.attrs.item4Title),
      ensureText(node.attrs.item4Body),
    ],
  ].filter(([title, body]) => title || body);

  const displayItems = items.length
    ? items
    : [
        [`${sectionLabel} 1`, "Supporting copy unavailable."],
        [`${sectionLabel} 2`, "Supporting copy unavailable."],
      ];

  return (
    <BlockShell selected={selected}>
      <div className="grid gap-4 md:grid-cols-2">
        {displayItems.map(([title, body], index) => (
          <AppPanel key={`${title}-${index}`} className="rounded-[10px] p-5">
            <h3 className={titleClass}>{title}</h3>
            <p className={`mt-3 ${bodyClass}`}>{body}</p>
          </AppPanel>
        ))}
      </div>
    </BlockShell>
  );
}

function PlaceholderView({ node, selected }: Pick<BlockProps, "node" | "selected">) {
  const preview =
    typeof node.attrs.preview === "string" ? node.attrs.preview : "";
  const previewKind =
    node.attrs.previewKind === "rich_text" ? "rich_text" : "plain";
  const previewSections = splitSections(preview);

  return (
    <NodeViewWrapper className="my-5">
      <AppPanel
        className={clsx(
          "placeholder-block pulse-line p-6",
          selected ? "!border-[rgba(66,230,164,0.7)]" : "",
        )}
      >
        <SectionBanner>{ensureText(node.attrs.label, "Generating")}</SectionBanner>
        {preview ? (
          previewKind === "rich_text" && previewSections.length ? (
            <div className="space-y-3">
              <p className={`${titleClass} whitespace-pre-wrap`}>
                {previewSections[0]}
              </p>
              {previewSections.slice(1).map((section, index) => (
                <p
                  key={`${node.attrs.blockId}-preview-${index}`}
                  className={`${bodyClass} whitespace-pre-wrap`}
                >
                  {section}
                </p>
              ))}
            </div>
          ) : (
            <p className={`${bodyClass} whitespace-pre-wrap`}>
              {preview}
            </p>
          )
        ) : (
          <p className="text-sm text-[var(--text-soft)]">
            Generating structured block...
          </p>
        )}
      </AppPanel>
    </NodeViewWrapper>
  );
}

function createBlockNode(config: {
  name: string;
  tag: string;
  attrs: Record<string, string>;
  component: (props: BlockProps) => React.JSX.Element;
}) {
  return Node.create({
    name: config.name,
    group: "block",
    atom: true,
    draggable: true,
    addAttributes() {
      return Object.fromEntries(
        Object.entries(config.attrs).map(([key, value]) => [
          key,
          { default: value },
        ]),
      );
    },
    parseHTML() {
      return [{ tag: config.tag }];
    },
    renderHTML({ HTMLAttributes }) {
      return [config.tag, mergeAttributes(HTMLAttributes)];
    },
    addNodeView() {
      return ReactNodeViewRenderer(config.component);
    },
  });
}

export const SectionHeader = Node.create({
  name: "sectionHeader",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      label: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "mivo-section-header" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mivo-section-header", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SectionHeaderView);
  },
});

export const HeroSection = createBlockNode({
  name: "heroSection",
  tag: "mivo-hero-section",
  component: HeroSectionView,
  attrs: {
    blockId: "",
    sectionLabel: "",
    eyebrow: "",
    title: "",
    subtitle: "",
    actionLabel: "",
  },
});

export const TwoColumn = createBlockNode({
  name: "twoColumn",
  tag: "mivo-two-column",
  component: TwoColumnView,
  attrs: {
    blockId: "",
    sectionLabel: "",
    leftTitle: "",
    leftBody: "",
    rightTitle: "",
    rightBody: "",
  },
});

export const ImageWithCopy = createBlockNode({
  name: "imageWithCopy",
  tag: "mivo-image-with-copy",
  component: ImageWithCopyView,
  attrs: {
    blockId: "",
    sectionLabel: "",
    imageUrl: "",
    title: "",
    body: "",
  },
});

export const CalloutBlock = createBlockNode({
  name: "calloutBlock",
  tag: "mivo-callout",
  component: CalloutView,
  attrs: {
    blockId: "",
    sectionLabel: "",
    label: "",
    body: "",
  },
});

export const QuoteBlock = createBlockNode({
  name: "quoteBlock",
  tag: "mivo-quote",
  component: QuoteView,
  attrs: {
    blockId: "",
    sectionLabel: "",
    quote: "",
    attribution: "",
  },
});

export const CtaBanner = createBlockNode({
  name: "ctaBanner",
  tag: "mivo-cta-banner",
  component: CtaBannerView,
  attrs: {
    blockId: "",
    sectionLabel: "",
    title: "",
    body: "",
    actionLabel: "",
  },
});

export const FeatureGrid = createBlockNode({
  name: "featureGrid",
  tag: "mivo-feature-grid",
  component: FeatureGridView,
  attrs: {
    blockId: "",
    sectionLabel: "",
    item1Title: "",
    item1Body: "",
    item2Title: "",
    item2Body: "",
    item3Title: "",
    item3Body: "",
    item4Title: "",
    item4Body: "",
  },
});

export const AiPlaceholder = Node.create({
  name: "aiPlaceholder",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      blockId: { default: "" },
      label: { default: "" },
      preview: { default: "" },
      previewKind: { default: "plain" },
      status: { default: "queued" },
    };
  },
  parseHTML() {
    return [{ tag: "mivo-ai-placeholder" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mivo-ai-placeholder", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PlaceholderView);
  },
});

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Placeholder.configure({
    placeholder: "Start editing or generate a structured draft",
  }),
  SectionHeader,
  HeroSection,
  TwoColumn,
  ImageWithCopy,
  CalloutBlock,
  QuoteBlock,
  CtaBanner,
  FeatureGrid,
  AiPlaceholder,
];
