import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { z } from "zod";
import { config } from "@/lib/config";
import { getOpenAI } from "@/lib/ai/client";
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
  image_with_copy: imageWithCopyBlockSchema,
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
  return finalResponse.output_parsed;
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

export function blockDataToNodes(blockId: string, block: z.infer<(typeof blockSchemaMap)[keyof typeof blockSchemaMap]>) {
  return blockToNodes(block, blockId);
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

function shouldUseComplexModel(contentType: ContentType, blockType: string) {
  return contentType === "landing_page" && ["hero_section", "feature_grid", "two_column"].includes(blockType);
}

export function fallbackDocument() {
  return createEmptyDocument();
}
