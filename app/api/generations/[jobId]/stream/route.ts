import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/core";
import { getOpenAI } from "@/lib/ai/client";
import { requireRequestUser } from "@/lib/auth-helpers";
import { ensureText } from "@/lib/utils";
import { getUserOpenAiApiKey } from "@/lib/openai-key";
import {
  appendGenerationEvent,
  claimQueuedGenerationJob,
  getAttachmentContext,
  getGenerationEventsSince,
  getGenerationJobForUser,
  getOwnedDocument,
  setJobStatus
} from "@/lib/records";
import {
  blockDataToNodes,
  buildAttachmentRetrievalQuery,
  buildStreamingPreview,
  createInitialDocumentTitle,
  generateImageForBlock,
  generateOutline,
  sanitizeContentType,
  streamBlock
} from "@/lib/ai/generation";
import {
  hydrateNodesFromPreview,
  insertPlaceholderNodes,
  replacePlaceholderWithNodes,
  sanitizeDocumentContent,
  updateGeneratedImageSource,
  updatePlaceholderPreview
} from "@/lib/schema/editor";
import type { Outline } from "@/lib/schema/content";

type OutboundEvent = {
  type: string;
  payload: Record<string, unknown>;
};

const encoder = new TextEncoder();

function toSse(event: OutboundEvent, id?: number) {
  return `${typeof id === "number" ? `id: ${id}\n` : ""}data: ${JSON.stringify(event)}\n\n`;
}

function createEventStreamResponse(event: OutboundEvent) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(toSse(event)));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}

function yieldForStreaming() {
  return new Promise<void>((resolve) => {
    if (typeof setImmediate === "function") {
      setImmediate(resolve);
      return;
    }

    setTimeout(resolve, 0);
  });
}

function ensureRenderableBlock(
  blockType: string,
  block: Record<string, unknown>,
  sectionLabel: string,
  sectionGoal: string,
) {
  switch (blockType) {
    case "hero_section":
      return {
        ...block,
        eyebrow: ensureText(block.eyebrow, sectionLabel),
        title: ensureText(block.title, sectionLabel),
        subtitle: ensureText(block.subtitle, sectionGoal),
        actionLabel: ensureText(block.actionLabel, "Learn more"),
      };
    case "two_column":
      return {
        ...block,
        leftTitle: ensureText(block.leftTitle, `${sectionLabel} left`),
        leftBody: ensureText(block.leftBody, sectionGoal),
        rightTitle: ensureText(block.rightTitle, `${sectionLabel} right`),
        rightBody: ensureText(block.rightBody, sectionGoal),
      };
    case "image_with_copy":
      return {
        ...block,
        title: ensureText(block.title, sectionLabel),
        body: ensureText(block.body, sectionGoal),
      };
    case "callout":
      return {
        ...block,
        label: ensureText(block.label, sectionLabel),
        body: ensureText(block.body, sectionGoal),
      };
    case "quote":
      return {
        ...block,
        quote: ensureText(block.quote, sectionGoal),
        attribution: ensureText(block.attribution, sectionLabel),
      };
    case "cta_banner":
      return {
        ...block,
        title: ensureText(block.title, sectionLabel),
        body: ensureText(block.body, sectionGoal),
        actionLabel: ensureText(block.actionLabel, "Learn more"),
      };
    case "feature_grid": {
      const items = Array.isArray(block.items)
        ? block.items.filter((item): item is Record<string, unknown> => Boolean(item))
        : [];

      return {
        ...block,
        items: items.length
          ? items.map((item, index) => ({
              title: ensureText(item.title, `${sectionLabel} ${index + 1}`),
              body: ensureText(item.body, sectionGoal),
            }))
          : [
              {
                title: `${sectionLabel} 1`,
                body: sectionGoal,
              },
              {
                title: `${sectionLabel} 2`,
                body: sectionGoal,
              },
            ],
      };
    }
    default:
      return block;
  }
}


export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const authState = await requireRequestUser(request);

  if (authState.response) {
    return authState.response;
  }

  const { jobId } = await params;
  const job = await getGenerationJobForUser(authState.user.id, jobId);

  if (!job) {
    return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
  }

  const apiKey = await getUserOpenAiApiKey(authState.user.id);

  if (!apiKey) {
    await setJobStatus(jobId, "failed", 0, "Add your OpenAI key to continue.");
    return createEventStreamResponse({
      type: "block.failed",
      payload: {
        blockId: "__generation__",
        error: "Add your OpenAI key to continue."
      }
    });
  }

  const client = getOpenAI(apiKey);

  const lastEventIdHeader = request.headers.get("last-event-id");
  const lastEventSequence = Number.parseInt(lastEventIdHeader ?? "0", 10);
  const initialSequence = Number.isFinite(lastEventSequence) ? lastEventSequence : 0;

  const stream = new ReadableStream({
    async start(controller) {
      let lastDeliveredSequence = initialSequence;
      let activeBlockId: string | null = null;

      const replayPersistedEvents = async () => {
        const events = await getGenerationEventsSince(jobId, lastDeliveredSequence);

        for (const event of events) {
          const outboundEvent = {
            type: event.eventType,
            payload: event.payload as Record<string, unknown>,
          };

          controller.enqueue(
            encoder.encode(toSse(outboundEvent, event.sequence)),
          );
          lastDeliveredSequence = event.sequence;
        }
      };

      const send = async (
        event: OutboundEvent,
        options?: { persist?: boolean }
      ) => {
        if (options?.persist === false) {
          controller.enqueue(encoder.encode(toSse(event)));
          return;
        }

        const sequence = await appendGenerationEvent(jobId, event.type, event.payload);
        controller.enqueue(encoder.encode(toSse(event, sequence)));
        lastDeliveredSequence = sequence;
      };

      try {
        await replayPersistedEvents();

        const claimedJob = await claimQueuedGenerationJob(jobId);

        if (!claimedJob) {
          while (true) {
            await replayPersistedEvents();

            const currentJob = await getGenerationJobForUser(authState.user.id, jobId);

            if (!currentJob || ["completed", "failed", "cancelled"].includes(currentJob.status)) {
              controller.close();
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        await send({ type: "generation.started", payload: { jobId } });

        const requestPayload = job.requestPayload as {
          documentId: string;
          prompt: string;
          contentType: string;
          attachmentIds?: string[];
          title?: string;
          draftContent?: JSONContent;
        };

        const document = await getOwnedDocument(authState.user.id, requestPayload.documentId);

        if (!document) {
          throw new Error("Document not found");
        }

        const contentType = sanitizeContentType(requestPayload.contentType);
        const retrievalQuery = buildAttachmentRetrievalQuery({
          contentType,
          prompt: requestPayload.prompt,
          title: requestPayload.title?.trim() || document.title,
        });
        const attachmentContext = await getAttachmentContext({
          apiKey,
          userId: authState.user.id,
          documentId: requestPayload.documentId,
          attachmentIds: requestPayload.attachmentIds ?? [],
          retrievalQuery,
        });
        const outline = (await generateOutline({
          client,
          contentType,
          prompt: requestPayload.prompt,
          context: attachmentContext
        })) as Outline;

        const baseContent = sanitizeDocumentContent(
          requestPayload.draftContent ?? (document.currentContentJson as JSONContent),
          contentType,
        );
        const baseTitle = requestPayload.title?.trim() || document.title;

        const nextTitle =
          outline.title ||
          baseTitle ||
          createInitialDocumentTitle(requestPayload.prompt, contentType);
        const placeholders = outline.blocks.map((block) => ({
          blockId: block.blockId,
          label: block.label
        }));
        let priorBlocks = "";
        let currentJson = insertPlaceholderNodes(baseContent, placeholders, contentType);
        const imageGenerationTasks: Array<Promise<void>> = [];

        await send({
          type: "outline.ready",
          payload: {
            title: nextTitle,
            placeholders
          }
        });
        const totalBlocks = outline.blocks.length;

        for (const [index, block] of outline.blocks.entries()) {
          const currentJob = await getGenerationJobForUser(authState.user.id, jobId);

          if (!currentJob || currentJob.status === "cancelled") {
            await send({ type: "generation.cancelled", payload: {} });
            controller.close();
            return;
          }

          activeBlockId = block.blockId;

          try {
            let preview = "";
            let streamedPreviewText = "";
            const previewKind = buildStreamingPreview(
              block.type as Parameters<typeof buildStreamingPreview>[0],
              ""
            ).kind;

            const structuredBlock = await streamBlock({
              client,
              contentType,
              blockType: block.type as Parameters<typeof streamBlock>[0]["blockType"],
              prompt: requestPayload.prompt,
              context: attachmentContext,
              title: nextTitle,
              outlineGoal: block.goal,
              priorBlocks,
              onDelta: async (delta) => {
                for (const character of Array.from(delta)) {
                  preview += character;
                  const nextPreview = buildStreamingPreview(
                    block.type as Parameters<typeof streamBlock>[0]["blockType"],
                    preview
                  );
                  const nextPreviewText = nextPreview.text;
                  const canAppend = nextPreviewText.startsWith(streamedPreviewText);
                  const previewDelta = canAppend
                    ? nextPreviewText.slice(streamedPreviewText.length)
                    : nextPreviewText;

                  if (!previewDelta) {
                    await yieldForStreaming();
                    continue;
                  }

                  streamedPreviewText = nextPreviewText;

                  await send(
                    {
                      type: "block.preview_delta",
                      payload: {
                        blockId: block.blockId,
                        delta: previewDelta,
                        preview: canAppend ? undefined : nextPreviewText,
                        previewKind,
                        replace: !canAppend
                      }
                    },
                    { persist: false }
                  );
                  await yieldForStreaming();
                }
              }
            });

            const nodes = hydrateNodesFromPreview(
              blockDataToNodes(
                block.blockId,
                ensureRenderableBlock(
                  block.type,
                  structuredBlock as Record<string, unknown>,
                  block.label,
                  block.goal,
                ) as never,
                block.label,
                contentType,
              ),
              buildStreamingPreview(
                block.type as Parameters<typeof buildStreamingPreview>[0],
                preview,
              ).text,
            );
            currentJson = replacePlaceholderWithNodes(
              currentJson,
              block.blockId,
              nodes,
              contentType,
            );
            priorBlocks = [priorBlocks, `${block.type}: ${block.label}`].filter(Boolean).join("\n");

            await send({
              type: "block.completed",
              payload: {
                blockId: block.blockId,
                nodes
              }
            });

            if (block.type === "image_with_copy") {
              const imageBlock = structuredBlock as {
                title: string;
                body: string;
                imagePrompt?: string;
              };

              imageGenerationTasks.push(
                (async () => {
                  const imageUrl = await generateImageForBlock({
                    client,
                    contentType,
                    title: imageBlock.title,
                    body: imageBlock.body,
                    imagePrompt: imageBlock.imagePrompt,
                  });

                  if (!imageUrl) {
                    return;
                  }

                  currentJson = updateGeneratedImageSource(
                    currentJson,
                    block.blockId,
                    imageUrl,
                    contentType,
                  );

                  await send({
                    type: "block.asset_ready",
                    payload: {
                      blockId: block.blockId,
                      imageUrl,
                    }
                  });
                })()
              );
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Generation failed";

            currentJson = updatePlaceholderPreview(
              currentJson,
              block.blockId,
              message,
              "failed",
              undefined,
              contentType,
            );

            await send({
              type: "block.failed",
              payload: {
                blockId: block.blockId,
                error: message,
              }
            });
          } finally {
            activeBlockId = null;
          }

          await setJobStatus(jobId, "running", Math.round(((index + 1) / totalBlocks) * 100));
        }

        await Promise.all(imageGenerationTasks);

        await setJobStatus(jobId, "completed", 100);
        await send({ type: "generation.completed", payload: { versionId: null } });

        controller.close();
      } catch (error) {
        await setJobStatus(jobId, "failed", 0, error instanceof Error ? error.message : "Generation failed");
        await send({
          type: "block.failed",
          payload: {
            blockId: activeBlockId ?? "__generation__",
            error: error instanceof Error ? error.message : "Generation failed"
          }
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
