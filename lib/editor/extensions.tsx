"use client";

import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { clsx } from "clsx";
import { AppInput, AppPanel, AppTextArea, FieldLabel } from "@/components/ui/primitives";

type BlockProps = {
  node: { attrs: Record<string, string> };
  updateAttributes: (attributes: Record<string, string>) => void;
  selected: boolean;
};

function BlockShell({ selected, children }: { selected: boolean; children: React.ReactNode }) {
  return (
    <NodeViewWrapper className="my-5">
      <AppPanel
        className={clsx(
          "p-6 transition",
          selected ? "!border-[rgba(66,230,164,0.55)] shadow-[0_0_0_1px_rgba(66,230,164,0.15)]" : ""
        )}
      >
        {children}
      </AppPanel>
    </NodeViewWrapper>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <FieldLabel className="mb-3">{children}</FieldLabel>;
}

function TextInput({
  value,
  onChange,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return <AppInput value={value} onChange={(event) => onChange(event.target.value)} className={className} />;
}

function TextArea({
  value,
  onChange,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return <AppTextArea value={value} rows={4} onChange={(event) => onChange(event.target.value)} className={className} />;
}

function HeroSectionView({ node, updateAttributes, selected }: BlockProps) {
  return (
    <BlockShell selected={selected}>
      <Label>Hero Section</Label>
      <TextInput
        value={node.attrs.eyebrow}
        onChange={(eyebrow) => updateAttributes({ eyebrow })}
        className="mb-4 h-11 text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]"
      />
      <TextArea
        value={node.attrs.title}
        onChange={(title) => updateAttributes({ title })}
        className="font-ui font-semibold mb-4 text-4xl leading-[0.92]"
      />
      <TextArea
        value={node.attrs.subtitle}
        onChange={(subtitle) => updateAttributes({ subtitle })}
        className="mb-6 text-sm text-[var(--text-muted)]"
      />
      <TextInput
        value={node.attrs.actionLabel}
        onChange={(actionLabel) => updateAttributes({ actionLabel })}
        className="h-12 max-w-[220px] text-sm text-white"
      />
    </BlockShell>
  );
}

function TwoColumnView({ node, updateAttributes, selected }: BlockProps) {
  return (
    <BlockShell selected={selected}>
      <Label>Two Column</Label>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <TextInput
            value={node.attrs.leftTitle}
            onChange={(leftTitle) => updateAttributes({ leftTitle })}
            className="font-ui font-semibold mb-3 text-2xl"
          />
          <TextArea value={node.attrs.leftBody} onChange={(leftBody) => updateAttributes({ leftBody })} className="text-sm text-[var(--text-muted)]" />
        </div>
        <div>
          <TextInput
            value={node.attrs.rightTitle}
            onChange={(rightTitle) => updateAttributes({ rightTitle })}
            className="font-ui font-semibold mb-3 text-2xl"
          />
          <TextArea
            value={node.attrs.rightBody}
            onChange={(rightBody) => updateAttributes({ rightBody })}
            className="text-sm text-[var(--text-muted)]"
          />
        </div>
      </div>
    </BlockShell>
  );
}

function ImageWithCopyView({ node, updateAttributes, selected }: BlockProps) {
  return (
    <BlockShell selected={selected}>
      <Label>Image With Copy</Label>
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex min-h-[180px] items-center justify-center rounded-[20px] border border-[var(--border)] bg-[var(--surface-2)] px-4 text-center text-sm text-[var(--text-soft)]">
          {node.attrs.imageUrl || "Image URL"}
        </div>
        <div>
          <TextInput value={node.attrs.imageUrl} onChange={(imageUrl) => updateAttributes({ imageUrl })} className="mb-4 h-11 text-xs text-[var(--text-soft)]" />
          <TextInput
            value={node.attrs.title}
            onChange={(title) => updateAttributes({ title })}
            className="font-ui font-semibold mb-3 text-3xl"
          />
          <TextArea value={node.attrs.body} onChange={(body) => updateAttributes({ body })} className="text-sm text-[var(--text-muted)]" />
        </div>
      </div>
    </BlockShell>
  );
}

function CalloutView({ node, updateAttributes, selected }: BlockProps) {
  return (
    <BlockShell selected={selected}>
      <Label>Callout</Label>
      <TextInput value={node.attrs.label} onChange={(label) => updateAttributes({ label })} className="mb-3 h-11 text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]" />
      <TextArea value={node.attrs.body} onChange={(body) => updateAttributes({ body })} className="font-ui font-semibold text-3xl leading-tight" />
    </BlockShell>
  );
}

function QuoteView({ node, updateAttributes, selected }: BlockProps) {
  return (
    <BlockShell selected={selected}>
      <Label>Quote</Label>
      <TextArea value={node.attrs.quote} onChange={(quote) => updateAttributes({ quote })} className="font-ui font-semibold text-4xl leading-tight" />
      <TextInput value={node.attrs.attribution} onChange={(attribution) => updateAttributes({ attribution })} className="mt-4 h-11 text-sm text-[var(--text-soft)]" />
    </BlockShell>
  );
}

function CtaBannerView({ node, updateAttributes, selected }: BlockProps) {
  return (
    <BlockShell selected={selected}>
      <Label>CTA Banner</Label>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <TextInput
            value={node.attrs.title}
            onChange={(title) => updateAttributes({ title })}
            className="font-ui font-semibold mb-3 text-3xl"
          />
          <TextArea value={node.attrs.body} onChange={(body) => updateAttributes({ body })} className="text-sm text-[var(--text-muted)]" />
        </div>
        <TextInput
          value={node.attrs.actionLabel}
          onChange={(actionLabel) => updateAttributes({ actionLabel })}
          className="h-12 min-w-[180px] text-sm text-white"
        />
      </div>
    </BlockShell>
  );
}

function FeatureGridView({ node, updateAttributes, selected }: BlockProps) {
  const items = [
    ["item1Title", "item1Body"],
    ["item2Title", "item2Body"],
    ["item3Title", "item3Body"],
    ["item4Title", "item4Body"]
  ] as const;

  return (
    <BlockShell selected={selected}>
      <Label>Feature Grid</Label>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(([titleKey, bodyKey], index) => (
          <AppPanel key={titleKey} className="p-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">Card {index + 1}</p>
            <TextInput
              value={node.attrs[titleKey]}
              onChange={(value) => updateAttributes({ [titleKey]: value })}
              className="font-ui font-semibold mb-3 text-2xl"
            />
            <TextArea value={node.attrs[bodyKey]} onChange={(value) => updateAttributes({ [bodyKey]: value })} className="text-sm text-[var(--text-muted)]" />
          </AppPanel>
        ))}
      </div>
    </BlockShell>
  );
}

function PlaceholderView({ node, selected }: Pick<BlockProps, "node" | "selected">) {
  return (
    <NodeViewWrapper className="my-5">
      <AppPanel className={clsx("placeholder-block pulse-line p-6", selected ? "!border-[rgba(66,230,164,0.7)]" : "")}>
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">{node.attrs.label}</p>
        <p className="text-sm text-[var(--text-soft)]">{node.attrs.preview || "Generating structured block..."}</p>
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
      return Object.fromEntries(Object.entries(config.attrs).map(([key, value]) => [key, { default: value }]));
    },
    parseHTML() {
      return [{ tag: config.tag }];
    },
    renderHTML({ HTMLAttributes }) {
      return [config.tag, mergeAttributes(HTMLAttributes)];
    },
    addNodeView() {
      return ReactNodeViewRenderer(config.component);
    }
  });
}

export const HeroSection = createBlockNode({
  name: "heroSection",
  tag: "mivo-hero-section",
  component: HeroSectionView,
  attrs: {
    blockId: "",
    eyebrow: "",
    title: "",
    subtitle: "",
    actionLabel: ""
  }
});

export const TwoColumn = createBlockNode({
  name: "twoColumn",
  tag: "mivo-two-column",
  component: TwoColumnView,
  attrs: {
    blockId: "",
    leftTitle: "",
    leftBody: "",
    rightTitle: "",
    rightBody: ""
  }
});

export const ImageWithCopy = createBlockNode({
  name: "imageWithCopy",
  tag: "mivo-image-with-copy",
  component: ImageWithCopyView,
  attrs: {
    blockId: "",
    imageUrl: "",
    title: "",
    body: ""
  }
});

export const CalloutBlock = createBlockNode({
  name: "calloutBlock",
  tag: "mivo-callout",
  component: CalloutView,
  attrs: {
    blockId: "",
    label: "",
    body: ""
  }
});

export const QuoteBlock = createBlockNode({
  name: "quoteBlock",
  tag: "mivo-quote",
  component: QuoteView,
  attrs: {
    blockId: "",
    quote: "",
    attribution: ""
  }
});

export const CtaBanner = createBlockNode({
  name: "ctaBanner",
  tag: "mivo-cta-banner",
  component: CtaBannerView,
  attrs: {
    blockId: "",
    title: "",
    body: "",
    actionLabel: ""
  }
});

export const FeatureGrid = createBlockNode({
  name: "featureGrid",
  tag: "mivo-feature-grid",
  component: FeatureGridView,
  attrs: {
    blockId: "",
    item1Title: "",
    item1Body: "",
    item2Title: "",
    item2Body: "",
    item3Title: "",
    item3Body: "",
    item4Title: "",
    item4Body: ""
  }
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
      status: { default: "queued" }
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
  }
});

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3]
    }
  }),
  Placeholder.configure({
    placeholder: "Start editing or generate a structured draft"
  }),
  HeroSection,
  TwoColumn,
  ImageWithCopy,
  CalloutBlock,
  QuoteBlock,
  CtaBanner,
  FeatureGrid,
  AiPlaceholder
];

export type EditorDoc = JSONContent;
