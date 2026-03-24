import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { JSONContent } from "@tiptap/core";
import { appendGenerationEvent, getAttachmentContext, getDocument, getGenerationJob, saveDocumentContent, setJobStatus } from "@/lib/records";
import { blockDataToNodes, createInitialDocumentTitle, generateOutline, sanitizeContentType, streamBlock } from "@/lib/ai/generation";
import { insertPlaceholderNodes, replacePlaceholderWithNodes } from "@/lib/schema/editor";
import type { Outline } from "@/lib/schema/content";

type OutboundEvent = {
  type: string;
  payload: Record<string, unknown>;
};

function toSse(event: OutboundEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getGenerationJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = async (event: OutboundEvent) => {
        controller.enqueue(toSse(event));
        await appendGenerationEvent(jobId, event.type, event.payload);
      };

      try {
        await setJobStatus(jobId, "running", 0);
        await send({ type: "generation.started", payload: { jobId } });

        const requestPayload = job.requestPayload as {
          documentId: string;
          prompt: string;
          contentType: string;
        };

        const document = await getDocument(requestPayload.documentId);

        if (!document) {
          throw new Error("Document not found");
        }

        const contentType = sanitizeContentType(requestPayload.contentType);
        const attachmentContext = await getAttachmentContext(requestPayload.documentId);
        const outline = (await generateOutline({
          contentType,
          prompt: requestPayload.prompt,
          context: attachmentContext
        })) as Outline;

        const nextTitle = outline.title || createInitialDocumentTitle(requestPayload.prompt, contentType);
        const placeholders = outline.blocks.map((block) => ({
          blockId: block.blockId,
          label: block.label
        }));
        let priorBlocks = "";
        let currentJson = insertPlaceholderNodes(document.currentContentJson as JSONContent, placeholders);

        await send({
          type: "outline.ready",
          payload: {
            title: nextTitle,
            placeholders
          }
        });
        const totalBlocks = outline.blocks.length;

        for (const [index, block] of outline.blocks.entries()) {
          const currentJob = await getGenerationJob(jobId);

          if (!currentJob || currentJob.status === "cancelled") {
            await send({ type: "generation.cancelled", payload: {} });
            controller.close();
            return;
          }

          let preview = "";

          const structuredBlock = await streamBlock({
            contentType,
            blockType: block.type as Parameters<typeof streamBlock>[0]["blockType"],
            prompt: requestPayload.prompt,
            context: attachmentContext,
            title: nextTitle,
            outlineGoal: block.goal,
            priorBlocks,
            onEvent: async (event) => {
              if (event.type === "response.output_text.delta") {
                preview += event.delta;
                await send({
                  type: "block.preview_delta",
                  payload: {
                    blockId: block.blockId,
                    preview
                  }
                });
              }
            }
          });

          const nodes = blockDataToNodes(block.blockId, structuredBlock as never);
          currentJson = replacePlaceholderWithNodes(currentJson, block.blockId, nodes);
          priorBlocks = [priorBlocks, `${block.type}: ${block.label}`].filter(Boolean).join("\n");

          await send({
            type: "block.completed",
            payload: {
              blockId: block.blockId,
              nodes
            }
          });

          await setJobStatus(jobId, "running", Math.round(((index + 1) / totalBlocks) * 100));
        }

        const versionId = await saveDocumentContent({
          documentId: requestPayload.documentId,
          title: nextTitle,
          content: currentJson,
          changeSource: "ai_generate",
          promptSnapshot: requestPayload,
          modelSnapshot: {
            defaultModel: process.env.OPENAI_MODEL_DEFAULT ?? "gpt-5-mini"
          }
        });

        await setJobStatus(jobId, "completed", 100);
        await send({ type: "generation.completed", payload: { versionId } });

        controller.close();
      } catch (error) {
        await setJobStatus(jobId, "failed", 0, error instanceof Error ? error.message : "Generation failed");
        await send({
          type: "block.failed",
          payload: {
            blockId: nanoid(),
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
      Connection: "keep-alive"
    }
  });
}
