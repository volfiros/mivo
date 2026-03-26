import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { z } from "zod";
import { config } from "@/lib/config";
import { getOpenAI } from "@/lib/ai/client";
import { saveGeneratedImage } from "@/lib/storage";
import {
  blockToNodes,
  createEmptyDocument
} from "@/lib/schema/editor";
import {
  calloutBlockSchema,
  contentTypeSchema,
  ctaBannerBlockSchema,
  featureGridBlockSchema,
  heroSectionBlockSchema,
  imageWithCopyBlockSchema,
  outlineSchema,
  quoteBlockSchema,
  richTextBlockSchema,
  type ContentType,
  type Outline
} from "@/lib/schema/content";
import { buildBlockInput, buildBlockInstructions, buildOutlineInput, buildOutlineInstructions, buildRewriteInstructions } from "@/lib/ai/prompts";

const imageWithCopyGenerationSchema = z.object({
  type: z.literal("image_with_copy"),
  imagePrompt: z.string().trim().optional().default(""),
  title: z.string().min(1),
  body: z.string().min(1)
});

const blockSchemaMap = {
  rich_text: richTextBlockSchema,
  hero_section: heroSectionBlockSchema,
  two_column: z.object({
    type: z.literal("two_column"),
    leftTitle: z.string().min(1),
    leftBody: z.string().min(1),
    rightTitle: z.string().min(1),
    rightBody: z.string().min(1)
  }),
  image_with_copy: imageWithCopyGenerationSchema,
  callout: calloutBlockSchema,
  quote: quoteBlockSchema,
  cta_banner: ctaBannerBlockSchema,
  feature_grid: featureGridBlockSchema
} as const;

export async function generateOutline(params: {
  contentType: ContentType;
  prompt: string;
  context: string;
}) {
  const client = getOpenAI();
  const response = await client.responses.parse({
    model: config.defaultModel,
    instructions: buildOutlineInstructions(params.contentType),
    input: buildOutlineInput(params),
    text: {
      format: zodTextFormat(outlineSchema, "mivo_outline")
    }
  });

  return response.output_parsed as Outline;
}

export async function streamBlock(params: {
  contentType: ContentType;
  blockType: keyof typeof blockSchemaMap;
  prompt: string;
  context: string;
  title: string;
  outlineGoal: string;
  priorBlocks: string;
  onEvent?: (event: ResponseStreamEvent) => Promise<void> | void;
  onDelta?: (delta: string) => Promise<void> | void;
}) {
  const client = getOpenAI();
  const schema = blockSchemaMap[params.blockType];
  const stream = client.responses.stream({
    model: shouldUseComplexModel(params.contentType, params.blockType) ? config.complexModel : config.defaultModel,
    instructions: buildBlockInstructions(params.contentType, params.blockType),
    input: buildBlockInput(params),
    text: {
      format: zodTextFormat(schema, `mivo_block_${params.blockType}`)
    }
  });

  for await (const event of stream) {
    if (params.onEvent) {
      await params.onEvent(event);
    }
    if (params.onDelta && event.type === 'response.output_text.delta') {
      await params.onDelta(event.delta);
    }
  }

  const finalResponse = await stream.finalResponse();
  const rawOutput = finalResponse.output_text ?? "";
  const parsed =
    finalResponse.output_parsed ??
    buildGeneratedBlockFromRawOutput(params.blockType, rawOutput);

  if (!parsed) {
    throw new Error(`Unable to parse ${params.blockType} block output`);
  }

  return normalizeGeneratedBlock(
    params.blockType,
    parsed,
    rawOutput
  );
}

export type StreamingPreview = {
  kind: "plain" | "rich_text";
  text: string;
};

export function buildStreamingPreview(blockType: keyof typeof blockSchemaMap, source: string): StreamingPreview {
  switch (blockType) {
    case "rich_text": {
      const heading = extractStringValue(source, "heading")?.value ?? "";
      const body = extractStringArray(source, "body");

      return {
        kind: "rich_text",
        text: [heading, ...body].filter(Boolean).join("\n\n")
      };
    }
    case "hero_section":
      return {
        kind: "plain",
        text: [
          extractStringValue(source, "title")?.value ?? "",
          extractStringValue(source, "subtitle")?.value ?? "",
          extractStringValue(source, "actionLabel")?.value ?? ""
        ]
          .filter(Boolean)
          .join("\n\n")
      };
    case "two_column":
      return {
        kind: "plain",
        text: [
          extractStringValue(source, "leftTitle")?.value ?? "",
          extractStringValue(source, "leftBody")?.value ?? "",
          extractStringValue(source, "rightTitle")?.value ?? "",
          extractStringValue(source, "rightBody")?.value ?? ""
        ]
          .filter(Boolean)
          .join("\n\n")
      };
    case "image_with_copy":
      return {
        kind: "plain",
        text: [
          extractStringValue(source, "title")?.value ?? "",
          extractStringValue(source, "body")?.value ?? ""
        ]
          .filter(Boolean)
          .join("\n\n")
      };
    case "callout":
      return {
        kind: "plain",
        text: [
          extractStringValue(source, "label")?.value ?? "",
          extractStringValue(source, "body")?.value ?? ""
        ]
          .filter(Boolean)
          .join("\n\n")
      };
    case "quote":
      return {
        kind: "plain",
        text: [
          extractStringValue(source, "quote")?.value ?? "",
          extractStringValue(source, "attribution")?.value ?? ""
        ]
          .filter(Boolean)
          .join("\n\n")
      };
    case "cta_banner":
      return {
        kind: "plain",
        text: [
          extractStringValue(source, "title")?.value ?? "",
          extractStringValue(source, "body")?.value ?? "",
          extractStringValue(source, "actionLabel")?.value ?? ""
        ]
          .filter(Boolean)
          .join("\n\n")
      };
    case "feature_grid": {
      const items = extractFeatureGridItems(source);

      return {
        kind: "plain",
        text: items
          .flatMap((item) => [item.title, item.body])
          .filter(Boolean)
          .join("\n\n")
      };
    }
  }
}

export async function rewriteSelection(params: {
  selectionText: string;
  instruction: string;
  documentTitle: string;
}) {
  const client = getOpenAI();
  const response = await client.responses.parse({
    model: config.defaultModel,
    instructions: buildRewriteInstructions(),
    input: [
      `Document title: ${params.documentTitle}`,
      `Selected text:\n${params.selectionText}`,
      `Instruction: ${params.instruction}`
    ].join("\n\n"),
    text: {
      format: zodTextFormat(
        z.object({
          replacement: z.string().min(1)
        }),
        "mivo_rewrite"
      )
    }
  });

  return response.output_parsed?.replacement ?? params.selectionText;
}

export function blockDataToNodes(
  blockId: string,
  block: z.infer<(typeof blockSchemaMap)[keyof typeof blockSchemaMap]>,
  sectionLabel?: string,
  contentType?: ContentType,
) {
  if (block.type === "image_with_copy") {
    return blockToNodes(
      imageWithCopyBlockSchema.parse({
        ...block,
        imageUrl: "",
      }),
      blockId,
      sectionLabel,
      contentType,
    );
  }

  return blockToNodes(block, blockId, sectionLabel, contentType);
}

export function serializePreviewBlocks(blocks: Array<{ label: string; type: string }>) {
  return blocks.map((block) => `${block.type}: ${block.label}`).join("\n");
}

export function sanitizeContentType(input: string) {
  return contentTypeSchema.parse(input);
}

export function createInitialDocumentTitle(prompt: string, contentType: ContentType) {
  const compact = prompt.trim().slice(0, 72);

  if (!compact) {
    return contentType === "social_post" ? "Untitled social post" : contentType === "blog_post" ? "Untitled article" : "Untitled landing page";
  }

  return compact;
}

export function buildAttachmentRetrievalQuery(params: {
  contentType: ContentType;
  prompt: string;
  title?: string;
}) {
  return [
    `Content type: ${params.contentType.replace(/_/g, " ")}`,
    params.title?.trim() ? `Document title: ${params.title.trim()}` : "",
    `User prompt: ${params.prompt.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeGeneratedBlock(
  _blockType: keyof typeof blockSchemaMap,
  parsed: z.infer<(typeof blockSchemaMap)[keyof typeof blockSchemaMap]>,
  rawOutput: string
) {
  switch (parsed.type) {
    case "rich_text":
      return richTextBlockSchema.parse({
        ...parsed,
        heading: normalizeText(parsed.heading, extractStringValue(rawOutput, "heading")?.value),
        body: normalizeTextArray(
          parsed.body,
          extractStringArray(rawOutput, "body")
        )
      });
    case "hero_section":
      return heroSectionBlockSchema.parse({
        ...parsed,
        eyebrow: normalizeText(parsed.eyebrow, extractStringValue(rawOutput, "eyebrow")?.value),
        title: normalizeText(parsed.title, extractStringValue(rawOutput, "title")?.value),
        subtitle: normalizeText(parsed.subtitle, extractStringValue(rawOutput, "subtitle")?.value),
        actionLabel: normalizeText(
          parsed.actionLabel,
          extractStringValue(rawOutput, "actionLabel")?.value
        )
      });
    case "two_column":
      return blockSchemaMap.two_column.parse({
        ...parsed,
        leftTitle: normalizeText(parsed.leftTitle, extractStringValue(rawOutput, "leftTitle")?.value),
        leftBody: normalizeText(parsed.leftBody, extractStringValue(rawOutput, "leftBody")?.value),
        rightTitle: normalizeText(parsed.rightTitle, extractStringValue(rawOutput, "rightTitle")?.value),
        rightBody: normalizeText(parsed.rightBody, extractStringValue(rawOutput, "rightBody")?.value)
      });
    case "image_with_copy":
      return imageWithCopyBlockSchema.parse({
        ...parsed,
        imagePrompt: normalizeText(
          "imagePrompt" in parsed ? parsed.imagePrompt : "",
          extractStringValue(rawOutput, "imagePrompt")?.value
        ),
        title: normalizeText(parsed.title, extractStringValue(rawOutput, "title")?.value),
        body: normalizeText(parsed.body, extractStringValue(rawOutput, "body")?.value)
      });
    case "callout":
      return calloutBlockSchema.parse({
        ...parsed,
        label: normalizeText(parsed.label, extractStringValue(rawOutput, "label")?.value),
        body: normalizeText(parsed.body, extractStringValue(rawOutput, "body")?.value)
      });
    case "quote":
      return quoteBlockSchema.parse({
        ...parsed,
        quote: normalizeText(parsed.quote, extractStringValue(rawOutput, "quote")?.value),
        attribution: normalizeText(
          parsed.attribution,
          extractStringValue(rawOutput, "attribution")?.value
        )
      });
    case "cta_banner":
      return ctaBannerBlockSchema.parse({
        ...parsed,
        title: normalizeText(parsed.title, extractStringValue(rawOutput, "title")?.value),
        body: normalizeText(parsed.body, extractStringValue(rawOutput, "body")?.value),
        actionLabel: normalizeText(
          parsed.actionLabel,
          extractStringValue(rawOutput, "actionLabel")?.value
        )
      });
    case "feature_grid": {
      const rawItems = extractFeatureGridItems(rawOutput);

      return featureGridBlockSchema.parse({
        ...parsed,
        items: parsed.items.map((item, index) => ({
          title: normalizeText(item.title, rawItems[index]?.title),
          body: normalizeText(item.body, rawItems[index]?.body)
        }))
      });
    }
  }
}

function buildGeneratedBlockFromRawOutput(
  blockType: keyof typeof blockSchemaMap,
  rawOutput: string
) {
  switch (blockType) {
    case "rich_text":
      return {
        type: "rich_text" as const,
        heading: extractStringValue(rawOutput, "heading")?.value ?? "",
        body: extractStringArray(rawOutput, "body")
      };
    case "hero_section":
      return {
        type: "hero_section" as const,
        eyebrow: extractStringValue(rawOutput, "eyebrow")?.value ?? "",
        title: extractStringValue(rawOutput, "title")?.value ?? "",
        subtitle: extractStringValue(rawOutput, "subtitle")?.value ?? "",
        actionLabel: extractStringValue(rawOutput, "actionLabel")?.value ?? ""
      };
    case "two_column":
      return {
        type: "two_column" as const,
        leftTitle: extractStringValue(rawOutput, "leftTitle")?.value ?? "",
        leftBody: extractStringValue(rawOutput, "leftBody")?.value ?? "",
        rightTitle: extractStringValue(rawOutput, "rightTitle")?.value ?? "",
        rightBody: extractStringValue(rawOutput, "rightBody")?.value ?? ""
      };
    case "image_with_copy":
      return {
        type: "image_with_copy" as const,
        imageUrl: extractStringValue(rawOutput, "imageUrl")?.value ?? "",
        imagePrompt: extractStringValue(rawOutput, "imagePrompt")?.value ?? "",
        title: extractStringValue(rawOutput, "title")?.value ?? "",
        body: extractStringValue(rawOutput, "body")?.value ?? ""
      };
    case "callout":
      return {
        type: "callout" as const,
        label: extractStringValue(rawOutput, "label")?.value ?? "",
        body: extractStringValue(rawOutput, "body")?.value ?? ""
      };
    case "quote":
      return {
        type: "quote" as const,
        quote: extractStringValue(rawOutput, "quote")?.value ?? "",
        attribution: extractStringValue(rawOutput, "attribution")?.value ?? ""
      };
    case "cta_banner":
      return {
        type: "cta_banner" as const,
        title: extractStringValue(rawOutput, "title")?.value ?? "",
        body: extractStringValue(rawOutput, "body")?.value ?? "",
        actionLabel: extractStringValue(rawOutput, "actionLabel")?.value ?? ""
      };
    case "feature_grid":
      return {
        type: "feature_grid" as const,
        items: extractFeatureGridItems(rawOutput)
      };
  }
}

function normalizeText(primary: string | undefined, fallback?: string) {
  const nextPrimary = primary?.trim();

  if (nextPrimary) {
    return nextPrimary;
  }

  const nextFallback = fallback?.trim();

  return nextFallback ?? "";
}

function normalizeTextArray(primary: string[] | undefined, fallback: string[]) {
  const normalizedPrimary = (primary ?? [])
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedPrimary.length) {
    return normalizedPrimary;
  }

  return fallback.map((item) => item.trim()).filter(Boolean);
}

function shouldUseComplexModel(contentType: ContentType, blockType: string) {
  return contentType === "landing_page" && ["hero_section", "feature_grid", "two_column"].includes(blockType);
}

export async function generateImageForBlock(params: {
  contentType: ContentType;
  title: string;
  body: string;
  imagePrompt?: string;
}) {
  const prompt = [
    params.imagePrompt?.trim(),
    params.title.trim(),
    params.body.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!prompt) {
    return "";
  }

  try {
    const client = getOpenAI();
    const response = await client.images.generate({
      model: config.imageModel,
      prompt,
      size: params.contentType === "landing_page" ? "1536x1024" : "1024x1024",
      quality: "low",
      output_format: "webp",
    });
    const imageData = response.data?.[0]?.b64_json;

    if (!imageData) {
      return "";
    }

    const saved = await saveGeneratedImage(Buffer.from(imageData, "base64"), "webp");
    return saved.publicPath;
  } catch {
    return "";
  }
}

export function fallbackDocument() {
  return createEmptyDocument();
}

function extractFeatureGridItems(source: string) {
  const itemsIndex = source.indexOf('"items"');

  if (itemsIndex === -1) {
    return [];
  }

  const scopedSource = source.slice(itemsIndex);
  const items: Array<{ title: string; body: string }> = [];
  let cursor = 0;

  while (cursor < scopedSource.length) {
    const title = extractStringValue(scopedSource, "title", cursor);

    if (!title) {
      break;
    }

    const body = extractStringValue(scopedSource, "body", title.nextIndex);

    items.push({
      title: title.value,
      body: body?.value ?? ""
    });

    cursor = body?.nextIndex ?? title.nextIndex;
  }

  return items;
}

function extractStringArray(source: string, key: string) {
  const keyIndex = source.indexOf(`"${key}"`);

  if (keyIndex === -1) {
    return [];
  }

  const colonIndex = source.indexOf(":", keyIndex + key.length + 2);

  if (colonIndex === -1) {
    return [];
  }

  const openBracketIndex = source.indexOf("[", colonIndex + 1);

  if (openBracketIndex === -1) {
    return [];
  }

  const values: string[] = [];
  let cursor = openBracketIndex + 1;

  while (cursor < source.length) {
    const closingBracketIndex = source.indexOf("]", cursor);
    const quoteIndex = source.indexOf('"', cursor);

    if (quoteIndex === -1 || (closingBracketIndex !== -1 && closingBracketIndex < quoteIndex)) {
      break;
    }

    const token = readJsonStringToken(source, quoteIndex + 1);

    if (token.value) {
      values.push(token.value);
    }

    cursor = token.nextIndex;

    if (!token.complete) {
      break;
    }
  }

  return values;
}

function extractStringValue(source: string, key: string, fromIndex = 0) {
  const keyIndex = source.indexOf(`"${key}"`, fromIndex);

  if (keyIndex === -1) {
    return null;
  }

  const colonIndex = source.indexOf(":", keyIndex + key.length + 2);

  if (colonIndex === -1) {
    return null;
  }

  const quoteIndex = source.indexOf('"', colonIndex + 1);

  if (quoteIndex === -1) {
    return null;
  }

  const token = readJsonStringToken(source, quoteIndex + 1);

  return {
    value: token.value,
    nextIndex: token.nextIndex
  };
}

function readJsonStringToken(source: string, startIndex: number) {
  let cursor = startIndex;
  let value = "";

  while (cursor < source.length) {
    const char = source[cursor];

    if (char === '"') {
      return {
        complete: true,
        nextIndex: cursor + 1,
        value
      };
    }

    if (char === "\\") {
      const escaped = source[cursor + 1];

      if (!escaped) {
        return {
          complete: false,
          nextIndex: source.length,
          value
        };
      }

      if (escaped === "u") {
        const unicodeValue = source.slice(cursor + 2, cursor + 6);

        if (unicodeValue.length < 4 || /[^0-9a-f]/i.test(unicodeValue)) {
          return {
            complete: false,
            nextIndex: source.length,
            value
          };
        }

        value += String.fromCharCode(parseInt(unicodeValue, 16));
        cursor += 6;
        continue;
      }

      value += decodeEscapedCharacter(escaped);
      cursor += 2;
      continue;
    }

    value += char;
    cursor += 1;
  }

  return {
    complete: false,
    nextIndex: source.length,
    value
  };
}

function decodeEscapedCharacter(value: string) {
  switch (value) {
    case '"':
      return '"';
    case "\\":
      return "\\";
    case "/":
      return "/";
    case "b":
      return "\b";
    case "f":
      return "\f";
    case "n":
      return "\n";
    case "r":
      return "\r";
    case "t":
      return "\t";
    default:
      return value;
  }
}
