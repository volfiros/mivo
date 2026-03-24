"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { editorExtensions } from "@/lib/editor/extensions";
import { insertPlaceholderNodes, replacePlaceholderWithNodes, updatePlaceholderPreview } from "@/lib/schema/editor";
import {
  AppButton,
  AppButtonLink,
  AppPanel,
  AppScrollArea,
  AppTextArea,
  FieldLabel,
  StatusBadge
} from "@/components/ui/primitives";

type VersionRecord = {
  id: string;
  versionNumber: number;
  createdAt: string | Date;
  storageMode: string;
};

type AttachmentRecord = {
  id: string;
  filename: string;
  mimeType: string;
  createdAt: string | Date;
};

type DocumentRecord = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  currentContentJson: JSONContent;
  versions: VersionRecord[];
  attachments: AttachmentRecord[];
};

type StreamEvent =
  | { type: "generation.started"; payload: { jobId: string } }
  | { type: "outline.ready"; payload: { title: string; placeholders: Array<{ blockId: string; label: string }> } }
  | { type: "block.preview_delta"; payload: { blockId: string; preview: string } }
  | { type: "block.completed"; payload: { blockId: string; nodes: JSONContent[] } }
  | { type: "block.failed"; payload: { blockId: string; error: string } }
  | { type: "generation.completed"; payload: { versionId: string | null } }
  | { type: "generation.cancelled"; payload: Record<string, never> };

function saveDocument(documentId: string, content: JSONContent, title: string) {
  return fetch(`/api/documents/${documentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      content
    })
  });
}

function useAutosave(editor: Editor | null, documentId: string, title: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleUpdate = ({ editor: currentEditor }: { editor: Editor }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void saveDocument(documentId, currentEditor.getJSON(), title);
      }, 500);
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [documentId, editor, title]);
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString();
}

export function Workspace({ document }: { document: DocumentRecord }) {
  const router = useRouter();
  const streamRef = useRef<EventSource | null>(null);
  const [title, setTitle] = useState(document.title);
  const [prompt, setPrompt] = useState("");
  const [rewritePrompt, setRewritePrompt] = useState("");
  const [overallStatus, setOverallStatus] = useState(document.status);
  const [attachmentIds, setAttachmentIds] = useState<string[]>(document.attachments.map((attachment) => attachment.id));
  const [jobId, setJobId] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<Record<string, string>>({});
  const [selectionText, setSelectionText] = useState("");
  const [busyUpload, setBusyUpload] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: document.currentContentJson
  });

  useAutosave(editor, document.id, title);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateSelection = () => {
      setSelectionText(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, "\n").trim());
    };

    updateSelection();
    editor.on("selectionUpdate", updateSelection);

    return () => {
      editor.off("selectionUpdate", updateSelection);
    };
  }, [editor]);

  const sortedVersions = useMemo(
    () => [...document.versions].sort((left, right) => right.versionNumber - left.versionNumber),
    [document.versions]
  );
  const blockEntries = Object.entries(blockStatus);
  const completedBlocks = blockEntries.filter(([, status]) => status === "completed").length;

  async function handleGenerate() {
    const response = await fetch("/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        documentId: document.id,
        prompt,
        contentType: document.contentType,
        attachmentIds
      })
    });

    const payload = await response.json();

    setJobId(payload.jobId);
    setOverallStatus("generating");
    subscribeToStream(payload.jobId);
  }

  function subscribeToStream(nextJobId: string) {
    streamRef.current?.close();

    const source = new EventSource(`/api/generations/${nextJobId}/stream`);
    streamRef.current = source;

    source.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as StreamEvent;

      if (!editor) {
        return;
      }

      if (parsed.type === "generation.started") {
        setOverallStatus("generating");
      }

      if (parsed.type === "outline.ready") {
        setTitle(parsed.payload.title);
        const nextDoc = insertPlaceholderNodes(editor.getJSON(), parsed.payload.placeholders);
        setBlockStatus(Object.fromEntries(parsed.payload.placeholders.map((placeholder) => [placeholder.blockId, "queued"])));
        editor.commands.setContent(nextDoc, false);
      }

      if (parsed.type === "block.preview_delta") {
        setBlockStatus((current) => ({ ...current, [parsed.payload.blockId]: "streaming" }));
        editor.commands.setContent(
          updatePlaceholderPreview(editor.getJSON(), parsed.payload.blockId, parsed.payload.preview),
          false
        );
      }

      if (parsed.type === "block.completed") {
        setBlockStatus((current) => ({ ...current, [parsed.payload.blockId]: "completed" }));
        editor.commands.setContent(
          replacePlaceholderWithNodes(editor.getJSON(), parsed.payload.blockId, parsed.payload.nodes),
          false
        );
      }

      if (parsed.type === "block.failed") {
        setBlockStatus((current) => ({ ...current, [parsed.payload.blockId]: "failed" }));
        editor.commands.setContent(
          updatePlaceholderPreview(editor.getJSON(), parsed.payload.blockId, parsed.payload.error, "failed"),
          false
        );
      }

      if (parsed.type === "generation.completed") {
        setOverallStatus("ready");
        source.close();
        streamRef.current = null;
        router.refresh();
      }

      if (parsed.type === "generation.cancelled") {
        setOverallStatus("cancelled");
        source.close();
        streamRef.current = null;
      }
    };
  }

  async function handleCancel() {
    if (!jobId) {
      return;
    }

    await fetch(`/api/generations/${jobId}/cancel`, {
      method: "POST"
    });

    setOverallStatus("cancelled");
    streamRef.current?.close();
    streamRef.current = null;
  }

  async function handleRewriteSelection() {
    if (!editor || !selectionText || !rewritePrompt) {
      return;
    }

    const response = await fetch(`/api/documents/${document.id}/revisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        documentId: document.id,
        instruction: rewritePrompt,
        selectionText
      })
    });

    const payload = await response.json();
    editor.chain().focus().insertContent(payload.replacement).run();
    setRewritePrompt("");
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusyUpload(true);

    try {
      const formData = new FormData();
      formData.append("documentId", document.id);
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      setAttachmentIds((current) => [...current, payload.attachmentId]);
      router.refresh();
    } finally {
      setBusyUpload(false);
      event.target.value = "";
    }
  }

  return (
    <div className="editor-shell">
      <aside className="studio-rail border-r border-[var(--border)] px-5 py-6 md:px-6">
        <div className="space-y-5">
          <div className="border-b border-[var(--border)] pb-5">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Document</p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-display text-4xl capitalize">{document.contentType.replace("_", " ")}</p>
              <StatusBadge status={overallStatus} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Persisted document state with checkpointed version history and block-aware generation controls.
            </p>
          </div>

          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Versions</p>
            <AppScrollArea className="max-h-[320px] pr-2">
              <div className="studio-list">
                {sortedVersions.map((version) => (
                  <div key={version.id} className="studio-list-row">
                    <div className="studio-list-copy">
                      <p className="text-sm font-semibold text-white">v{version.versionNumber}</p>
                      <p className="mt-2 text-xs text-[var(--text-soft)]">{formatDate(version.createdAt)}</p>
                    </div>
                    <StatusBadge status={version.storageMode} />
                  </div>
                ))}
              </div>
            </AppScrollArea>
          </div>

          <div className="app-section-divider pt-5">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Attachments</p>
            <AppScrollArea className="max-h-[260px] pr-2">
              {document.attachments.length ? (
                <div className="studio-list">
                  {document.attachments.map((attachment) => (
                    <div key={attachment.id} className="studio-list-row">
                      <div className="studio-list-copy">
                        <p className="truncate text-sm font-semibold text-white">{attachment.filename}</p>
                        <p className="mt-2 text-xs text-[var(--text-soft)]">{attachment.mimeType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--text-muted)]">No files attached yet.</p>
              )}
            </AppScrollArea>
          </div>
        </div>
      </aside>

      <section className="px-5 py-6 md:px-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <FieldLabel>Document Title</FieldLabel>
              <AppTextArea
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                rows={2}
                placeholder="Untitled draft"
                className="studio-title-field mt-3"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AppButtonLink href={`/preview/${document.id}` as Route} tone="secondary" size="3">
                Open Preview
              </AppButtonLink>
              <AppButtonLink href="/studio/new" tone="ghost" size="3">
                New Draft
              </AppButtonLink>
            </div>
          </div>

          <AppPanel className="studio-editor-frame min-h-[760px] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Working draft</p>
            <div className="mt-5">
              <EditorContent editor={editor} />
            </div>
          </AppPanel>
        </div>
      </section>

      <aside className="studio-rail border-l border-[var(--border)] px-5 py-6 md:px-6">
        <div className="space-y-5">
          <div>
            <FieldLabel>Generate</FieldLabel>
            <AppTextArea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="Describe the content you want to generate"
              className="mt-3"
            />
            <div className="mt-4 grid gap-3">
              <AppButton
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || overallStatus === "generating"}
                tone="primary"
                size="3"
              >
                Generate Draft
              </AppButton>
              <AppButton
                type="button"
                onClick={handleCancel}
                disabled={!jobId || overallStatus !== "generating"}
                tone="secondary"
                size="3"
              >
                Stop Generation
              </AppButton>
              <AppButton asChild tone="secondary" size="3">
                <label className="cursor-pointer">
                  {busyUpload ? "Uploading..." : "Attach File"}
                  <input type="file" className="hidden" onChange={handleUpload} />
                </label>
              </AppButton>
            </div>
          </div>

          <div className="app-section-divider pt-5">
            <FieldLabel>Selection Rewrite</FieldLabel>
            <div className="mt-3 border border-[var(--border)] bg-[rgba(15,24,21,0.52)] p-4">
              <p className="text-sm leading-6 text-[var(--text-soft)]">
                {selectionText || "Select text in the editor to revise it."}
              </p>
            </div>
            <AppTextArea
              value={rewritePrompt}
              onChange={(event) => setRewritePrompt(event.target.value)}
              rows={4}
              placeholder="Rewrite this to sound sharper and more premium"
              className="mt-4"
            />
            <AppButton
              type="button"
              onClick={handleRewriteSelection}
              disabled={!selectionText || !rewritePrompt.trim()}
              tone="secondary"
              size="3"
              className="mt-4 w-full"
            >
              Rewrite Selection
            </AppButton>
          </div>

          <div className="app-section-divider pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">Block Progress</p>
              <StatusBadge
                status={completedBlocks === blockEntries.length && blockEntries.length ? "ready" : "streaming"}
                label={`${completedBlocks}/${Math.max(blockEntries.length, 1)} ready`}
              />
            </div>
            <AppScrollArea className="max-h-[360px] pr-2">
              {blockEntries.length ? (
                <div className="studio-list">
                  {blockEntries.map(([blockId, status]) => (
                    <div key={blockId} className="studio-list-row">
                      <p className="studio-list-copy text-sm font-semibold text-white">{blockId}</p>
                      <StatusBadge status={status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--text-muted)]">No generation activity yet.</p>
              )}
            </AppScrollArea>
          </div>
        </div>
      </aside>
    </div>
  );
}
