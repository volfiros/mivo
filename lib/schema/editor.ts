import type { JSONContent } from "@tiptap/core";
import { type ContentType, type SemanticBlock } from "@/lib/schema/content";

type FeatureItem = {
  title: string;
  body: string;
};

type LandingSectionVariant =
  | "hero"
  | "feature-grid"
  | "two-column"
  | "image-with-copy"
  | "quote"
  | "cta"
  | "callout"
  | "text";

type EditorialSection = {
  label: string;
  nodes: JSONContent[];
};

function compactSectionLabel(label?: string) {
  const nextLabel = label
    ?.replace(/[\r\n]+/g, " ")
    .split(/[:\-–—|]/)[0]
    ?.replace(/\s+/g, " ")
    .trim();

  return nextLabel ?? "";
}

function isLandingContentType(contentType?: ContentType | null) {
  return contentType === "landing_page";
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
      label,
    },
  };
}

function landingSectionNode(
  variant: LandingSectionVariant,
  label: string,
  content: JSONContent[],
  blockId = "",
): JSONContent {
  return {
    type: "landingSection",
    attrs: {
      variant,
      label: label.trim() || "Section",
      blockId: blockId.trim(),
    },
    content: content.length ? content : [paragraphNode(" ")],
  };
}

function landingColumnNode(content: JSONContent[]): JSONContent {
  return {
    type: "landingColumn",
    content: content.length ? content : [paragraphNode(" ")],
  };
}

function landingFeatureCardNode(content: JSONContent[]): JSONContent {
  return {
    type: "landingFeatureCard",
    content: content.length ? content : [paragraphNode(" ")],
  };
}

function generatedImageNode(
  src: string,
  alt = "Generated image",
  blockId?: string,
  allowEmpty = false,
): JSONContent | null {
  const nextSrc = src.trim();

  if (!nextSrc && !allowEmpty) {
    return null;
  }

  return {
    type: "generatedImage",
    attrs: {
      src: nextSrc,
      alt: alt.trim() || "Generated image",
      blockId: blockId?.trim() ?? "",
    },
  };
}

function paragraphNode(text: string): JSONContent {
  const content = inlineTextContent(text);

  return {
    type: "paragraph",
    ...(content ? { content } : {}),
  };
}

function boldParagraphNode(text: string): JSONContent {
  const nextText = text.trim();

  return {
    type: "paragraph",
    ...(nextText
      ? {
          content: [
            {
              type: "text",
              text: nextText,
              marks: [{ type: "bold" }],
            },
          ],
        }
      : {}),
  };
}

function blockquoteNode(text: string): JSONContent {
  return {
    type: "blockquote",
    content: [paragraphNode(text)],
  };
}

function headingNode(text: string, level: 1 | 2 | 3 = 2): JSONContent {
  const content = inlineTextContent(text);

  return {
    type: "heading",
    attrs: { level },
    ...(content ? { content } : {}),
  };
}

function inlineTextContent(text: string): JSONContent[] | undefined {
  if (text.length === 0) {
    return undefined;
  }

  return [{ type: "text", text }];
}

function sectionHeaderNodes(label?: string) {
  const nextLabel = label?.trim();

  if (!nextLabel) {
    return [];
  }

  return [sectionHeaderNode(nextLabel)];
}

function paragraphNodes(values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .map((value) => paragraphNode(value));
}

function featureItemNodes(items: FeatureItem[]) {
  return items.flatMap((item) => {
    const title = item.title.trim();
    const body = item.body.trim();

    return [
      ...(title ? [headingNode(title, 3)] : []),
      ...(body ? [paragraphNode(body)] : []),
    ];
  });
}

function plainTextFromNode(node: JSONContent | undefined): string {
  if (!node) {
    return "";
  }

  if (node.type === "text") {
    return node.text ?? "";
  }

  return (
    node.content
      ?.map((child) => plainTextFromNode(child))
      .join("") ?? ""
  );
}

function isBlankParagraph(node: JSONContent | undefined) {
  return node?.type === "paragraph" && !plainTextFromNode(node).trim();
}

function nodeHasGeneratedImage(node: JSONContent) {
  if (node.type === "generatedImage") {
    return true;
  }

  return node.content?.some(nodeHasGeneratedImage) ?? false;
}

function extractHeadingParagraphPairs(nodes: JSONContent[]) {
  const pairs: FeatureItem[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];

    if (node.type !== "heading") {
      continue;
    }

    const title = plainTextFromNode(node).trim();
    const nextNode = nodes[index + 1];
    const body =
      nextNode?.type === "paragraph"
        ? plainTextFromNode(nextNode).trim()
        : "";

    if (title || body) {
      pairs.push({ title, body });
    }

    if (nextNode?.type === "paragraph") {
      index += 1;
    }
  }

  return pairs;
}

function splitNodesIntoChunks(nodes: JSONContent[]) {
  const chunks: JSONContent[][] = [];
  let currentChunk: JSONContent[] = [];

  const flush = () => {
    if (!currentChunk.length) {
      return;
    }

    chunks.push(currentChunk);
    currentChunk = [];
  };

  for (const node of nodes) {
    if (node.type === "heading" && currentChunk.length) {
      flush();
    }

    currentChunk.push(node);
  }

  flush();

  return chunks.filter((chunk) => chunk.length);
}

function canNormalizeToFeatureGrid(nodes: JSONContent[]) {
  let itemCount = 0;
  let index = 0;

  while (index < nodes.length) {
    if (nodes[index]?.type !== "heading") {
      return false;
    }

    itemCount += 1;
    index += 1;

    if (nodes[index]?.type === "paragraph") {
      index += 1;
    }
  }

  return itemCount >= 2;
}

function inferLandingSectionVariant(
  label: string,
  nodes: JSONContent[],
): LandingSectionVariant {
  const normalizedLabel = label.trim().toLowerCase();
  const headingPairs = extractHeadingParagraphPairs(nodes);

  if (normalizedLabel.includes("hero")) {
    return "hero";
  }

  if (normalizedLabel.includes("feature")) {
    return "feature-grid";
  }

  if (normalizedLabel.includes("cta")) {
    return "cta";
  }

  if (normalizedLabel.includes("quote")) {
    return "quote";
  }

  if (normalizedLabel.includes("callout")) {
    return "callout";
  }

  if (normalizedLabel.includes("image") || normalizedLabel.includes("visual")) {
    return "image-with-copy";
  }

  if (normalizedLabel.includes("positioning") || normalizedLabel.includes("column")) {
    return "two-column";
  }

  if (nodes.some(nodeHasGeneratedImage)) {
    return "image-with-copy";
  }

  if (headingPairs.length >= 3) {
    return "feature-grid";
  }

  if (headingPairs.length === 2) {
    return "two-column";
  }

  return "text";
}

function normalizeLandingSectionContent(
  variant: LandingSectionVariant,
  nodes: JSONContent[],
): { variant: LandingSectionVariant; content: JSONContent[] } {
  switch (variant) {
    case "feature-grid": {
      if (!canNormalizeToFeatureGrid(nodes)) {
        return { variant: "text", content: nodes };
      }

      const items = extractHeadingParagraphPairs(nodes);

      if (items.length < 2) {
        return { variant: "text", content: nodes };
      }

      return {
        variant,
        content: items.map((item) =>
          landingFeatureCardNode([
            ...(item.title ? [headingNode(item.title, 3)] : []),
            ...(item.body ? [paragraphNode(item.body)] : []),
          ]),
        ),
      };
    }
    case "two-column": {
      const chunks = splitNodesIntoChunks(nodes);

      if (
        chunks.length !== 2 ||
        chunks.some((chunk) => chunk[0]?.type !== "heading")
      ) {
        return { variant: "text", content: nodes };
      }

      return {
        variant,
        content: chunks.map((chunk) => landingColumnNode(chunk)),
      };
    }
    case "image-with-copy": {
      const mediaNodes = nodes.filter(nodeHasGeneratedImage);
      const textNodes = nodes.filter((node) => !nodeHasGeneratedImage(node));

      if (!mediaNodes.length) {
        return { variant: "text", content: nodes };
      }

      return {
        variant,
        content: [
          landingColumnNode(mediaNodes),
          ...(textNodes.length ? [landingColumnNode(textNodes)] : []),
        ],
      };
    }
    default:
      return { variant, content: nodes };
  }
}

function normalizeLegacyLandingEditorialSections(nodes: JSONContent[]) {
  const result: JSONContent[] = [];
  let editorialBuffer: JSONContent[] = [];

  const flushBuffer = () => {
    if (!editorialBuffer.length) {
      return;
    }

    result.push(...groupEditorialSectionsIntoLandingSections(editorialBuffer));
    editorialBuffer = [];
  };

  for (const node of nodes) {
    if (node.type === "landingSection" || node.type === "aiPlaceholder") {
      flushBuffer();
      result.push(node);
      continue;
    }

    editorialBuffer.push(node);
  }

  flushBuffer();

  return result;
}

function groupEditorialSectionsIntoLandingSections(nodes: JSONContent[]) {
  if (nodes.length === 1 && isBlankParagraph(nodes[0])) {
    return nodes;
  }

  const sections: EditorialSection[] = [];
  let currentLabel = "";
  let currentNodes: JSONContent[] = [];

  const flushSection = () => {
    if (!currentLabel && currentNodes.length === 0) {
      return;
    }

    sections.push({
      label: currentLabel.trim(),
      nodes: currentNodes,
    });
    currentLabel = "";
    currentNodes = [];
  };

  for (const node of nodes) {
    if (node.type === "sectionHeader") {
      flushSection();
      currentLabel = sectionHeaderLabel(node);
      continue;
    }

    currentNodes.push(node);
  }

  flushSection();

  return sections
    .filter((section) => section.nodes.length > 0)
    .map((section) => {
      const nextLabel = section.label || "Section";
      const inferredVariant = inferLandingSectionVariant(
        nextLabel,
        section.nodes,
      );
      const { variant, content } = normalizeLandingSectionContent(
        inferredVariant,
        section.nodes,
      );

      return landingSectionNode(variant, nextLabel, content);
    });
}

function semanticBlockFromLegacyNode(node: JSONContent): SemanticBlock | null {
  switch (node.type) {
    case "heroSection":
      return {
        type: "hero_section",
        eyebrow: String(node.attrs?.eyebrow ?? ""),
        title: String(node.attrs?.title ?? ""),
        subtitle: String(node.attrs?.subtitle ?? ""),
        actionLabel: String(node.attrs?.actionLabel ?? ""),
      };
    case "twoColumn":
      return {
        type: "two_column",
        leftTitle: String(node.attrs?.leftTitle ?? ""),
        leftBody: String(node.attrs?.leftBody ?? ""),
        rightTitle: String(node.attrs?.rightTitle ?? ""),
        rightBody: String(node.attrs?.rightBody ?? ""),
      };
    case "imageWithCopy":
      return {
        type: "image_with_copy",
        imageUrl: String(node.attrs?.imageUrl ?? ""),
        imagePrompt: "",
        title: String(node.attrs?.title ?? ""),
        body: String(node.attrs?.body ?? ""),
      };
    case "calloutBlock":
      return {
        type: "callout",
        label: String(node.attrs?.label ?? ""),
        body: String(node.attrs?.body ?? ""),
      };
    case "quoteBlock":
      return {
        type: "quote",
        quote: String(node.attrs?.quote ?? ""),
        attribution: String(node.attrs?.attribution ?? ""),
      };
    case "ctaBanner":
      return {
        type: "cta_banner",
        title: String(node.attrs?.title ?? ""),
        body: String(node.attrs?.body ?? ""),
        actionLabel: String(node.attrs?.actionLabel ?? ""),
      };
    case "featureGrid": {
      const items: FeatureItem[] = [
        {
          title: String(node.attrs?.item1Title ?? ""),
          body: String(node.attrs?.item1Body ?? ""),
        },
        {
          title: String(node.attrs?.item2Title ?? ""),
          body: String(node.attrs?.item2Body ?? ""),
        },
        {
          title: String(node.attrs?.item3Title ?? ""),
          body: String(node.attrs?.item3Body ?? ""),
        },
        {
          title: String(node.attrs?.item4Title ?? ""),
          body: String(node.attrs?.item4Body ?? ""),
        },
      ].filter((item) => item.title.trim() || item.body.trim());

      return {
        type: "feature_grid",
        items,
      };
    }
    default:
      return null;
  }
}

function legacyStructuredNodeToEditableNodes(
  node: JSONContent,
  contentType?: ContentType,
): JSONContent[] | null {
  const block = semanticBlockFromLegacyNode(node);

  if (!block) {
    return null;
  }

  const sectionLabel =
    typeof node.attrs?.sectionLabel === "string" ? node.attrs.sectionLabel : "";
  const blockId =
    typeof node.attrs?.blockId === "string" ? node.attrs.blockId : "";

  return blockToNodes(block, blockId, sectionLabel, contentType);
}

function sectionHeaderLabel(node: JSONContent | undefined) {
  if (node?.type !== "sectionHeader") {
    return "";
  }

  return typeof node.attrs?.label === "string" ? node.attrs.label.trim() : "";
}

function normalizeTopLevelEditableBlocks(
  nodes: JSONContent[],
  contentType?: ContentType,
) {
  return nodes.reduce<JSONContent[]>((result, node) => {
    const replacement = legacyStructuredNodeToEditableNodes(node, contentType);

    if (!replacement) {
      const nextNodeLabel = sectionHeaderLabel(node);
      const previousNodeLabel = sectionHeaderLabel(result[result.length - 1]);

      if (nextNodeLabel && nextNodeLabel === previousNodeLabel) {
        return result;
      }

      result.push(node);
      return result;
    }

    const nextNodes = [...replacement];
    const previousNodeLabel = sectionHeaderLabel(result[result.length - 1]);
    const replacementHeaderLabel = sectionHeaderLabel(nextNodes[0]);

    if (
      previousNodeLabel &&
      replacementHeaderLabel &&
      previousNodeLabel === replacementHeaderLabel
    ) {
      nextNodes.shift();
    }

    result.push(...nextNodes);
    return result;
  }, []);
}

function blockToEditorialNodes(
  block: SemanticBlock,
  blockId: string,
  sectionLabel?: string,
): JSONContent[] {
  const nextSectionLabel = sectionLabelForBlock(block.type, sectionLabel);
  const headerNodes = sectionHeaderNodes(nextSectionLabel);

  switch (block.type) {
    case "rich_text":
      return [
        ...headerNodes,
        headingNode(block.heading),
        ...block.body.map(paragraphNode),
      ];
    case "hero_section":
      return [
        ...headerNodes,
        ...paragraphNodes([block.eyebrow]),
        headingNode(block.title),
        ...paragraphNodes([block.subtitle, block.actionLabel]),
      ];
    case "two_column":
      return [
        ...headerNodes,
        headingNode(block.leftTitle, 3),
        paragraphNode(block.leftBody),
        headingNode(block.rightTitle, 3),
        paragraphNode(block.rightBody),
      ];
    case "image_with_copy": {
      const imageNode = generatedImageNode(
        block.imageUrl,
        block.title,
        blockId,
        true,
      );

      return [
        ...headerNodes,
        ...(imageNode ? [imageNode] : []),
        headingNode(block.title),
        paragraphNode(block.body),
      ];
    }
    case "callout":
      return [
        ...headerNodes,
        headingNode(block.label, 3),
        paragraphNode(block.body),
      ];
    case "quote":
      return [
        ...headerNodes,
        blockquoteNode(block.quote),
        paragraphNode(block.attribution),
      ];
    case "cta_banner":
      return [
        ...headerNodes,
        headingNode(block.title),
        paragraphNode(block.body),
        boldParagraphNode(block.actionLabel),
      ];
    case "feature_grid":
      return [...headerNodes, ...featureItemNodes(block.items)];
  }
}

function blockToLandingNodes(
  block: SemanticBlock,
  blockId: string,
  sectionLabel?: string,
): JSONContent[] {
  const nextSectionLabel = sectionLabelForBlock(block.type, sectionLabel);

  switch (block.type) {
    case "rich_text":
      return [
        landingSectionNode(
          "text",
          nextSectionLabel,
          [headingNode(block.heading), ...block.body.map(paragraphNode)],
          blockId,
        ),
      ];
    case "hero_section":
      return [
        landingSectionNode(
          "hero",
          nextSectionLabel,
          [
            ...paragraphNodes([block.eyebrow]),
            headingNode(block.title, 1),
            paragraphNode(block.subtitle),
            boldParagraphNode(block.actionLabel),
          ],
          blockId,
        ),
      ];
    case "two_column":
      return [
        landingSectionNode(
          "two-column",
          nextSectionLabel,
          [
            landingColumnNode([
              headingNode(block.leftTitle, 3),
              paragraphNode(block.leftBody),
            ]),
            landingColumnNode([
              headingNode(block.rightTitle, 3),
              paragraphNode(block.rightBody),
            ]),
          ],
          blockId,
        ),
      ];
    case "image_with_copy": {
      const imageNode = generatedImageNode(
        block.imageUrl,
        block.title,
        blockId,
        true,
      );

      return [
        landingSectionNode(
          "image-with-copy",
          nextSectionLabel,
          [
            landingColumnNode(imageNode ? [imageNode] : []),
            landingColumnNode([
              headingNode(block.title),
              paragraphNode(block.body),
            ]),
          ],
          blockId,
        ),
      ];
    }
    case "callout":
      return [
        landingSectionNode(
          "callout",
          nextSectionLabel,
          [headingNode(block.label, 3), paragraphNode(block.body)],
          blockId,
        ),
      ];
    case "quote":
      return [
        landingSectionNode(
          "quote",
          nextSectionLabel,
          [blockquoteNode(block.quote), paragraphNode(block.attribution)],
          blockId,
        ),
      ];
    case "cta_banner":
      return [
        landingSectionNode(
          "cta",
          nextSectionLabel,
          [
            headingNode(block.title),
            paragraphNode(block.body),
            boldParagraphNode(block.actionLabel),
          ],
          blockId,
        ),
      ];
    case "feature_grid":
      return [
        landingSectionNode(
          "feature-grid",
          nextSectionLabel,
          block.items.map((item) =>
            landingFeatureCardNode([
              headingNode(item.title, 3),
              paragraphNode(item.body),
            ]),
          ),
          blockId,
        ),
      ];
  }
}

export function blockToNodes(
  block: SemanticBlock,
  blockId: string,
  sectionLabel?: string,
  contentType?: ContentType,
): JSONContent[] {
  if (isLandingContentType(contentType)) {
    return blockToLandingNodes(block, blockId, sectionLabel);
  }

  return blockToEditorialNodes(block, blockId, sectionLabel);
}

export function createEmptyDocument(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export function sanitizeDocumentContent(
  value: JSONContent | null | undefined,
  contentType?: ContentType,
): JSONContent {
  const sanitizedRoot = sanitizeNode(value);

  if (!sanitizedRoot) {
    return createEmptyDocument();
  }

  if (sanitizedRoot.type !== "doc") {
    return {
      type: "doc",
      content: [sanitizedRoot],
    };
  }

  if (
    !Array.isArray(sanitizedRoot.content) ||
    sanitizedRoot.content.length === 0
  ) {
    return createEmptyDocument();
  }

  const normalizedContent = normalizeTopLevelEditableBlocks(
    sanitizedRoot.content,
    contentType,
  );

  return {
    ...sanitizedRoot,
    content: isLandingContentType(contentType)
      ? normalizeLegacyLandingEditorialSections(normalizedContent)
      : normalizedContent,
  };
}

export function insertPlaceholderNodes(
  doc: JSONContent,
  placeholders: Array<{ blockId: string; label: string }>,
  contentType?: ContentType,
): JSONContent {
  const safeDoc = sanitizeDocumentContent(doc, contentType);
  const content =
    Array.isArray(safeDoc.content) &&
    !(safeDoc.content.length === 1 && isBlankParagraph(safeDoc.content[0]))
      ? [...safeDoc.content]
      : [];

  const placeholderNodes = placeholders.map((placeholder) => ({
    type: "aiPlaceholder",
    attrs: {
      blockId: placeholder.blockId,
      label: placeholder.label,
      preview: "",
      previewKind: "plain",
      status: "queued",
    },
  }));

  return {
    ...safeDoc,
    content: [...content, ...placeholderNodes],
  };
}

export function updatePlaceholderPreview(
  doc: JSONContent,
  blockId: string,
  preview: string,
  status = "streaming",
  previewKind?: "plain" | "rich_text",
  contentType?: ContentType,
): JSONContent {
  const nextPreviewKind = previewKind ?? "plain";

  return sanitizeDocumentContent(
    walkDoc(sanitizeDocumentContent(doc, contentType), (node) => {
      if (node.type === "aiPlaceholder" && node.attrs?.blockId === blockId) {
        return {
          ...node,
          attrs: {
            ...node.attrs,
            preview,
            previewKind: nextPreviewKind,
            status,
          },
        };
      }

      return node;
    }),
    contentType,
  );
}

export function replacePlaceholderWithNodes(
  doc: JSONContent,
  blockId: string,
  nodes: JSONContent[],
  contentType?: ContentType,
): JSONContent {
  const safeDoc = sanitizeDocumentContent(doc, contentType);

  if (!Array.isArray(safeDoc.content)) {
    return safeDoc;
  }

  return sanitizeDocumentContent(
    {
      ...safeDoc,
      content: replaceNodesInArray(safeDoc.content, blockId, nodes),
    },
    contentType,
  );
}

export function updateGeneratedImageSource(
  doc: JSONContent,
  blockId: string,
  src: string,
  contentType?: ContentType,
): JSONContent {
  const nextSrc = src.trim();

  if (!nextSrc) {
    return sanitizeDocumentContent(doc, contentType);
  }

  return sanitizeDocumentContent(
    walkDoc(sanitizeDocumentContent(doc, contentType), (node) => {
      if (node.type === "generatedImage" && node.attrs?.blockId === blockId) {
        return {
          ...node,
          attrs: {
            ...node.attrs,
            src: nextSrc,
          },
        };
      }

      return node;
    }),
    contentType,
  );
}

function replaceNodesInArray(
  nodes: JSONContent[],
  blockId: string,
  replacement: JSONContent[],
): JSONContent[] {
  return nodes.flatMap((node) => {
    if (node.type === "aiPlaceholder" && node.attrs?.blockId === blockId) {
      return replacement;
    }

    if (Array.isArray(node.content)) {
      return [
        {
          ...node,
          content: replaceNodesInArray(node.content, blockId, replacement),
        },
      ];
    }

    return [node];
  });
}

function walkDoc(
  node: JSONContent,
  transform: (node: JSONContent) => JSONContent,
): JSONContent {
  const next = transform(node);

  if (!Array.isArray(next.content)) {
    return next;
  }

  return {
    ...next,
    content: next.content.map((child) => walkDoc(child, transform)),
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
      text: node.text,
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
