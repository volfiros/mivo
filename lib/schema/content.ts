import { z } from "zod";

export const contentTypeSchema = z.enum(["social_post", "blog_post", "landing_page"]);

export const richTextBlockSchema = z.object({
  type: z.literal("rich_text"),
  heading: z.string().min(1),
  body: z.array(z.string().min(1)).min(1)
});

export const heroSectionBlockSchema = z.object({
  type: z.literal("hero_section"),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  actionLabel: z.string().min(1)
});

export const twoColumnBlockSchema = z.object({
  type: z.literal("two_column"),
  leftTitle: z.string().min(1),
  leftBody: z.string().min(1),
  rightTitle: z.string().min(1),
  rightBody: z.string().min(1)
});

export const imageWithCopyBlockSchema = z.object({
  type: z.literal("image_with_copy"),
  imageUrl: z.string().url().or(z.string().startsWith("/")).or(z.literal("")),
  title: z.string().min(1),
  body: z.string().min(1)
});

export const calloutBlockSchema = z.object({
  type: z.literal("callout"),
  label: z.string().min(1),
  body: z.string().min(1)
});

export const quoteBlockSchema = z.object({
  type: z.literal("quote"),
  quote: z.string().min(1),
  attribution: z.string().min(1)
});

export const ctaBannerBlockSchema = z.object({
  type: z.literal("cta_banner"),
  title: z.string().min(1),
  body: z.string().min(1),
  actionLabel: z.string().min(1)
});

export const featureGridBlockSchema = z.object({
  type: z.literal("feature_grid"),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1)
      })
    )
    .min(2)
    .max(4)
});

export const placeholderBlockSchema = z.object({
  type: z.literal("placeholder"),
  blockId: z.string().min(1),
  label: z.string().min(1)
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
  blockId: z.string().min(1),
  type: semanticBlockSchema.options.map((option) => option.shape.type.value).includes("rich_text")
    ? z.enum(["rich_text", "hero_section", "two_column", "image_with_copy", "callout", "quote", "cta_banner", "feature_grid"])
    : z.never(),
  label: z.string().min(1),
  goal: z.string().min(1)
});

export const outlineSchema = z.object({
  title: z.string().min(1),
  blocks: z.array(outlineBlockSchema).min(1)
});

export const generationRequestSchema = z.object({
  documentId: z.string().min(1),
  prompt: z.string().min(1),
  contentType: contentTypeSchema,
  attachmentIds: z.array(z.string()).default([]),
  title: z.string().min(1),
  draftContent: z.any().optional()
});

export const rewriteRequestSchema = z.object({
  documentId: z.string().min(1),
  instruction: z.string().min(1),
  selectionText: z.string().min(1)
});

export type ContentType = z.infer<typeof contentTypeSchema>;
export type SemanticBlock = z.infer<typeof semanticBlockSchema>;
export type Outline = z.infer<typeof outlineSchema>;
export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type RewriteRequest = z.infer<typeof rewriteRequestSchema>;
