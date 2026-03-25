import type { JSONContent } from "@tiptap/core";
import { type SemanticBlock } from "@/lib/schema/content";

type FeatureItem = {
  title: string;
  body: string;
};

function compactSectionLabel(label?: string) {
  const nextLabel = label
    ?.replace(/[\r\n]+/g, " ")
    .split(/[:\-–—|]/)[0]
    ?.replace(/\s+/g, " ")
    .trim();

  return nextLabel ?? "";
}

function sectionLabelForBlock(blockType: SemanticBlock["type"], label?: string) {
  const compact = compactSectionLabel(label);

  switch (blockType) {
    case "cta_banner":
      return "CTA";
    case "hero_section":
      return "Hero";
    case "feature_grid":
      return "Features";
    case "image_with_copy":
      return compact || "Visual";
    case "two_column":
      return compact || "Positioning";
    case "callout":
      return compact || "Callout";
    case "quote":
      return "Quote";
    case "rich_text":
      return compact || "Announcement";
  }
}

function sectionHeaderNode(label: string): JSONContent {
  return {
    type: "sectionHeader",
    attrs: {
      label
    }
  };
}

function paragraphNode(text: string): JSONContent {
  const content = inlineTextContent(text);

  return {
    type: "paragraph",
    ...(content ? { content } : {})
  };
}

function headingNode(text: string, level: 2 | 3 = 2): JSONContent {
  const content = inlineTextContent(text);

  return {
    type: "heading",
    attrs: { level },
    ...(content ? { content } : {})
  };
}

function inlineTextContent(text: string): JSONContent[] | undefined {
  if (text.length === 0) {
    return undefined;
  }

  return [{ type: "text", text }];
}

function featureAttrs(items: FeatureItem[]) {
  return {
    item1Title: items[0]?.title ?? "",
    item1Body: items[0]?.body ?? "",
    item2Title: items[1]?.title ?? "",
    item2Body: items[1]?.body ?? "",
    item3Title: items[2]?.title ?? "",
    item3Body: items[2]?.body ?? "",
    item4Title: items[3]?.title ?? "",
    item4Body: items[3]?.body ?? ""
  };
}

function sectionHeaderNodes(label?: string) {
  const nextLabel = label?.trim();

  if (!nextLabel) {
    return [];
  }

  return [sectionHeaderNode(nextLabel)];
}

export function blockToNodes(
  block: SemanticBlock,
  blockId: string,
  sectionLabel?: string,
): JSONContent[] {
  const nextSectionLabel = sectionLabelForBlock(block.type, sectionLabel);
  const headerNodes = sectionHeaderNodes(nextSectionLabel);

  switch (block.type) {
    case "rich_text":
      return [...headerNodes, headingNode(block.heading), ...block.body.map(paragraphNode)];
    case "hero_section":
      return [
        ...headerNodes,
        {
          type: "heroSection",
          attrs: {
            blockId,
            sectionLabel: nextSectionLabel,
            eyebrow: block.eyebrow,
            title: block.title,
            subtitle: block.subtitle,
            actionLabel: block.actionLabel
          }
        }
      ];
    case "two_column":
      return [
        ...headerNodes,
        {
          type: "twoColumn",
          attrs: {
            blockId,
            sectionLabel: nextSectionLabel,
            leftTitle: block.leftTitle,
            leftBody: block.leftBody,
            rightTitle: block.rightTitle,
            rightBody: block.rightBody
          }
        }
      ];
    case "image_with_copy":
      return [
        ...headerNodes,
        {
          type: "imageWithCopy",
          attrs: {
            blockId,
            sectionLabel: nextSectionLabel,
            imageUrl: block.imageUrl,
            title: block.title,
            body: block.body
          }
        }
      ];
    case "callout":
      return [
        ...headerNodes,
        {
          type: "calloutBlock",
          attrs: {
            blockId,
            sectionLabel: nextSectionLabel,
            label: block.label,
            body: block.body
          }
        }
      ];
    case "quote":
      return [
        ...headerNodes,
        {
          type: "quoteBlock",
          attrs: {
            blockId,
            sectionLabel: nextSectionLabel,
            quote: block.quote,
            attribution: block.attribution
          }
        }
      ];
    case "cta_banner":
      return [
        ...headerNodes,
        {
          type: "ctaBanner",
          attrs: {
            blockId,
            sectionLabel: nextSectionLabel,
            title: block.title,
            body: block.body,
            actionLabel: block.actionLabel
          }
        }
      ];
    case "feature_grid":
      return [
        ...headerNodes,
        {
          type: "featureGrid",
          attrs: {
            blockId,
            sectionLabel: nextSectionLabel,
            ...featureAttrs(block.items)
          }
        }
      ];
  }
}

export function createEmptyDocument(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }]
  };
}

export function sanitizeDocumentContent(value: JSONContent | null | undefined): JSONContent {
  const sanitizedRoot = sanitizeNode(value);

  if (!sanitizedRoot) {
    return createEmptyDocument();
  }

  if (sanitizedRoot.type !== "doc") {
    return {
      type: "doc",
      content: [sanitizedRoot]
    };
  }

  if (!Array.isArray(sanitizedRoot.content) || sanitizedRoot.content.length === 0) {
    return createEmptyDocument();
  }

  return sanitizedRoot;
}

export function insertPlaceholderNodes(doc: JSONContent, placeholders: Array<{ blockId: string; label: string }>): JSONContent {
  const safeDoc = sanitizeDocumentContent(doc);
  const content = Array.isArray(safeDoc.content) ? [...safeDoc.content] : [];

  const placeholderNodes = placeholders.map((placeholder) => ({
    type: "aiPlaceholder",
    attrs: {
      blockId: placeholder.blockId,
      label: placeholder.label,
      preview: "",
      previewKind: "plain",
      status: "queued"
    }
  }));

  return {
    ...safeDoc,
    content: [...content, ...placeholderNodes]
  };
}

export function updatePlaceholderPreview(
  doc: JSONContent,
  blockId: string,
  preview: string,
  status = "streaming",
  previewKind?: "plain" | "rich_text"
): JSONContent {
  const nextPreviewKind = previewKind ?? "plain";

  return sanitizeDocumentContent(walkDoc(sanitizeDocumentContent(doc), (node) => {
    if (node.type === "aiPlaceholder" && node.attrs?.blockId === blockId) {
      return {
        ...node,
        attrs: {
          ...node.attrs,
          preview,
          previewKind: nextPreviewKind,
          status
        }
      };
    }

    return node;
  }));
}

export function replacePlaceholderWithNodes(doc: JSONContent, blockId: string, nodes: JSONContent[]): JSONContent {
  const safeDoc = sanitizeDocumentContent(doc);

  if (!Array.isArray(safeDoc.content)) {
    return safeDoc;
  }

  return sanitizeDocumentContent({
    ...safeDoc,
    content: replaceNodesInArray(safeDoc.content, blockId, nodes)
  });
}

function replaceNodesInArray(nodes: JSONContent[], blockId: string, replacement: JSONContent[]): JSONContent[] {
  return nodes.flatMap((node) => {
    if (node.type === "aiPlaceholder" && node.attrs?.blockId === blockId) {
      return replacement;
    }

    if (Array.isArray(node.content)) {
      return [
        {
          ...node,
          content: replaceNodesInArray(node.content, blockId, replacement)
        }
      ];
    }

    return [node];
  });
}

function walkDoc(node: JSONContent, transform: (node: JSONContent) => JSONContent): JSONContent {
  const next = transform(node);

  if (!Array.isArray(next.content)) {
    return next;
  }

  return {
    ...next,
    content: next.content.map((child) => walkDoc(child, transform))
  };
}

function sanitizeNode(node: JSONContent | null | undefined): JSONContent | null {
  if (!node || typeof node !== "object" || typeof node.type !== "string") {
    return null;
  }

  if (node.type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) {
      return null;
    }

    return {
      ...node,
      text: node.text
    };
  }

  const nextNode: JSONContent = { ...node };

  if (Array.isArray(node.content)) {
    const sanitizedChildren = node.content
      .map((child) => sanitizeNode(child))
      .filter((child): child is JSONContent => child !== null);

    if (sanitizedChildren.length > 0) {
      nextNode.content = sanitizedChildren;
    } else {
      delete nextNode.content;
    }
  }

  return nextNode;
}
