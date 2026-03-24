import type { JSONContent } from "@tiptap/core";
import { type SemanticBlock } from "@/lib/schema/content";

type FeatureItem = {
  title: string;
  body: string;
};

function paragraphNode(text: string): JSONContent {
  return {
    type: "paragraph",
    content: [{ type: "text", text }]
  };
}

function headingNode(text: string, level: 2 | 3 = 2): JSONContent {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }]
  };
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

export function blockToNodes(block: SemanticBlock, blockId: string): JSONContent[] {
  switch (block.type) {
    case "rich_text":
      return [headingNode(block.heading), ...block.body.map(paragraphNode)];
    case "hero_section":
      return [
        {
          type: "heroSection",
          attrs: {
            blockId,
            eyebrow: block.eyebrow,
            title: block.title,
            subtitle: block.subtitle,
            actionLabel: block.actionLabel
          }
        }
      ];
    case "two_column":
      return [
        {
          type: "twoColumn",
          attrs: {
            blockId,
            leftTitle: block.leftTitle,
            leftBody: block.leftBody,
            rightTitle: block.rightTitle,
            rightBody: block.rightBody
          }
        }
      ];
    case "image_with_copy":
      return [
        {
          type: "imageWithCopy",
          attrs: {
            blockId,
            imageUrl: block.imageUrl,
            title: block.title,
            body: block.body
          }
        }
      ];
    case "callout":
      return [
        {
          type: "calloutBlock",
          attrs: {
            blockId,
            label: block.label,
            body: block.body
          }
        }
      ];
    case "quote":
      return [
        {
          type: "quoteBlock",
          attrs: {
            blockId,
            quote: block.quote,
            attribution: block.attribution
          }
        }
      ];
    case "cta_banner":
      return [
        {
          type: "ctaBanner",
          attrs: {
            blockId,
            title: block.title,
            body: block.body,
            actionLabel: block.actionLabel
          }
        }
      ];
    case "feature_grid":
      return [
        {
          type: "featureGrid",
          attrs: {
            blockId,
            ...featureAttrs(block.items)
          }
        }
      ];
  }
}

export function createEmptyDocument(): JSONContent {
  return {
    type: "doc",
    content: [paragraphNode("")]
  };
}

export function insertPlaceholderNodes(doc: JSONContent, placeholders: Array<{ blockId: string; label: string }>): JSONContent {
  const content = Array.isArray(doc.content) ? [...doc.content] : [];

  const placeholderNodes = placeholders.map((placeholder) => ({
    type: "aiPlaceholder",
    attrs: {
      blockId: placeholder.blockId,
      label: placeholder.label,
      preview: "",
      status: "queued"
    }
  }));

  return {
    ...doc,
    content: [...content, ...placeholderNodes]
  };
}

export function updatePlaceholderPreview(doc: JSONContent, blockId: string, preview: string, status = "streaming"): JSONContent {
  return walkDoc(doc, (node) => {
    if (node.type === "aiPlaceholder" && node.attrs?.blockId === blockId) {
      return {
        ...node,
        attrs: {
          ...node.attrs,
          preview,
          status
        }
      };
    }

    return node;
  });
}

export function replacePlaceholderWithNodes(doc: JSONContent, blockId: string, nodes: JSONContent[]): JSONContent {
  if (!Array.isArray(doc.content)) {
    return doc;
  }

  return {
    ...doc,
    content: replaceNodesInArray(doc.content, blockId, nodes)
  };
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
