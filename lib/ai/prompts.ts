import type { ContentType } from "@/lib/schema/content";

const blockGuidance: Record<ContentType, string> = {
  social_post: "Prefer rich_text, callout, quote, and cta_banner. Keep it concise and publication-ready.",
  blog_post: "Prefer hero_section, rich_text, image_with_copy, callout, quote, and cta_banner. Keep structure scannable and editorial.",
  landing_page: "Prefer hero_section, feature_grid, two_column, image_with_copy, quote, and cta_banner. Focus on conversion and hierarchy."
};

export function buildOutlineInstructions(contentType: ContentType) {
  return [
    "You are designing structured marketing content for a block-based editor.",
    "Return only sections that can be rendered cleanly in a premium editorial product.",
    "Each block should have a clear role and avoid redundancy.",
    blockGuidance[contentType]
  ].join(" ");
}

export function buildOutlineInput(params: {
  contentType: ContentType;
  prompt: string;
  context: string;
}) {
  return [
    `Content type: ${params.contentType}`,
    `User prompt: ${params.prompt}`,
    params.context ? `Reference material:\n${params.context}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildBlockInstructions(contentType: ContentType, blockType: string) {
  return [
    "You are generating one block for a structured content editor.",
    "Return valid structured data only.",
    "Stay consistent with the tone and structure of the requested document.",
    `Document type: ${contentType}.`,
    `Block type: ${blockType}.`
  ].join(" ");
}

export function buildBlockInput(params: {
  prompt: string;
  context: string;
  title: string;
  outlineGoal: string;
  priorBlocks: string;
}) {
  return [
    `Document title: ${params.title}`,
    `Prompt: ${params.prompt}`,
    `Current block goal: ${params.outlineGoal}`,
    params.priorBlocks ? `Completed sections so far:\n${params.priorBlocks}` : "",
    params.context ? `Reference material:\n${params.context}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildRewriteInstructions() {
  return [
    "You are revising selected text inside an editor.",
    "Return only replacement text.",
    "Preserve the user's intent while making the requested change."
  ].join(" ");
}
