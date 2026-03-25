import { z } from "zod";

export const contentTypeSchema = z.enum(["social_post", "blog_post", "landing_page"]);
const nonEmptyText = z.string().trim().min(1);

export const richTextBlockSchema = z.object({
  type: z.literal("rich_text"),
  heading: nonEmptyText,
  body: z.array(nonEmptyText).min(1)
});

export const heroSectionBlockSchema = z.object({
  type: z.literal("hero_section"),
  eyebrow: nonEmptyText,
  title: nonEmptyText,
  subtitle: nonEmptyText,
  actionLabel: nonEmptyText
});

export const twoColumnBlockSchema = z.object({
  type: z.literal("two_column"),
  leftTitle: nonEmptyText,
  leftBody: nonEmptyText,
  rightTitle: nonEmptyText,
  rightBody: nonEmptyText
});

export const imageWithCopyBlockSchema = z.object({
  type: z.literal("image_with_copy"),
  imageUrl: z.string().url().or(z.string().startsWith("/")).or(z.literal("")),
  title: nonEmptyText,
  body: nonEmptyText
});

export const calloutBlockSchema = z.object({
  type: z.literal("callout"),
  label: nonEmptyText,
  body: nonEmptyText
});

export const quoteBlockSchema = z.object({
  type: z.literal("quote"),
  quote: nonEmptyText,
  attribution: nonEmptyText
});

export const ctaBannerBlockSchema = z.object({
  type: z.literal("cta_banner"),
  title: nonEmptyText,
  body: nonEmptyText,
  actionLabel: nonEmptyText
});

export const featureGridBlockSchema = z.object({
  type: z.literal("feature_grid"),
  items: z
    .array(
      z.object({
        title: nonEmptyText,
        body: nonEmptyText
      })
    )
    .min(2)
    .max(4)
});

export const placeholderBlockSchema = z.object({
  type: z.literal("placeholder"),
  blockId: nonEmptyText,
  label: nonEmptyText
});

export const semanticBlockSchema = z.discriminatedUnion("type", [
  richTextBlockSchema,
  heroSectionBlockSchema,
  twoColumnBlockSchema,
  imageWithCopyBlockSchema,
  calloutBlockSchema,
  quoteBlockSchema,
  ctaBannerBlockSchema,
  featureGridBlockSchema
]);

export const outlineBlockSchema = z.object({
  blockId: nonEmptyText,
  type: semanticBlockSchema.options.map((option) => option.shape.type.value).includes("rich_text")
    ? z.enum(["rich_text", "hero_section", "two_column", "image_with_copy", "callout", "quote", "cta_banner", "feature_grid"])
    : z.never(),
  label: nonEmptyText,
  goal: nonEmptyText
});

export const outlineSchema = z.object({
  title: nonEmptyText,
  blocks: z.array(outlineBlockSchema).min(1)
});

export const generationRequestSchema = z.object({
  documentId: nonEmptyText,
  prompt: nonEmptyText,
  contentType: contentTypeSchema,
  attachmentIds: z.array(z.string()).default([]),
  title: nonEmptyText,
  draftContent: z.any().optional()
});

export const rewriteRequestSchema = z.object({
  documentId: nonEmptyText,
  instruction: nonEmptyText,
  selectionText: nonEmptyText
});

export type ContentType = z.infer<typeof contentTypeSchema>;
export type SemanticBlock = z.infer<typeof semanticBlockSchema>;
export type Outline = z.infer<typeof outlineSchema>;
export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type RewriteRequest = z.infer<typeof rewriteRequestSchema>;
