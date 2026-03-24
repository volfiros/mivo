"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { editorExtensions } from "@/lib/editor/extensions";
import {
  insertPlaceholderNodes,
  replacePlaceholderWithNodes,
  updatePlaceholderPreview,
} from "@/lib/schema/editor";
import {
  AppButton,
  AppScrollArea,
  AppTextArea,
  StatusBadge,
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
  | {
      type: "outline.ready";
      payload: {
        title: string;
        placeholders: Array<{ blockId: string; label: string }>;
      };
    }
  | {
      type: "block.preview_delta";
      payload: { blockId: string; preview: string };
    }
  | {
      type: "block.completed";
      payload: { blockId: string; nodes: JSONContent[] };
    }
  | { type: "block.failed"; payload: { blockId: string; error: string } }
  | { type: "generation.completed"; payload: { versionId: string | null } }
  | { type: "generation.cancelled"; payload: Record<string, never> };

function saveDocument(documentId: string, content: JSONContent, title: string) {
  return fetch(`/api/documents/${documentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      content,
    }),
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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export function Workspace({ document }: { document: DocumentRecord }) {
  const router = useRouter();
  const streamRef = useRef<EventSource | null>(null);
  const [title, setTitle] = useState(document.title);
  const [prompt, setPrompt] = useState("");
  const [rewritePrompt, setRewritePrompt] = useState("");
  const [overallStatus, setOverallStatus] = useState(document.status);
  const [attachmentIds, setAttachmentIds] = useState<string[]>(
    document.attachments.map((attachment) => attachment.id),
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<Record<string, string>>({});
  const [selectionText, setSelectionText] = useState("");
  const [busyUpload, setBusyUpload] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: document.currentContentJson,
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
      setSelectionText(
        editor.state.doc
          .textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            "\n",
          )
          .trim(),
      );
    };

    updateSelection();
    editor.on("selectionUpdate", updateSelection);

    return () => {
      editor.off("selectionUpdate", updateSelection);
    };
  }, [editor]);

  const sortedVersions = useMemo(
    () =>
      [...document.versions].sort(
        (left, right) => right.versionNumber - left.versionNumber,
      ),
    [document.versions],
  );
  const blockEntries = Object.entries(blockStatus);
  const completedBlocks = blockEntries.filter(
    ([, status]) => status === "completed",
  ).length;

  async function handleGenerate() {
    const response = await fetch("/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId: document.id,
        prompt,
        contentType: document.contentType,
        attachmentIds,
      }),
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
        const nextDoc = insertPlaceholderNodes(
          editor.getJSON(),
          parsed.payload.placeholders,
        );
        setBlockStatus(
          Object.fromEntries(
            parsed.payload.placeholders.map((placeholder) => [
              placeholder.blockId,
              "queued",
            ]),
          ),
        );
        editor.commands.setContent(nextDoc, false);
      }

      if (parsed.type === "block.preview_delta") {
        setBlockStatus((current) => ({
          ...current,
          [parsed.payload.blockId]: "streaming",
        }));
        editor.commands.setContent(
          updatePlaceholderPreview(
            editor.getJSON(),
            parsed.payload.blockId,
            parsed.payload.preview,
          ),
          false,
        );
      }

      if (parsed.type === "block.completed") {
        setBlockStatus((current) => ({
          ...current,
          [parsed.payload.blockId]: "completed",
        }));
        editor.commands.setContent(
          replacePlaceholderWithNodes(
            editor.getJSON(),
            parsed.payload.blockId,
            parsed.payload.nodes,
          ),
          false,
        );
      }

      if (parsed.type === "block.failed") {
        setBlockStatus((current) => ({
          ...current,
          [parsed.payload.blockId]: "failed",
        }));
        editor.commands.setContent(
          updatePlaceholderPreview(
            editor.getJSON(),
            parsed.payload.blockId,
            parsed.payload.error,
            "failed",
          ),
          false,
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
      method: "POST",
    });

    setOverallStatus("cancelled");
    streamRef.current?.close();
    streamRef.current = null;
  }

  function handleNavigation(target: string) {
    if (overallStatus === "generating") {
      setConfirmDialog({
        isOpen: true,
        title: "Process in Progress",
        message:
          "A generation process is currently running. Leaving this page will halt the process. Do you wish to continue?",
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await handleCancel();
          router.push(target);
        },
      });
    } else {
      router.push(target);
    }
  }

  function handleHalt() {
    setConfirmDialog({
      isOpen: true,
      title: "Halt Generation",
      message:
        "Are you sure you want to manually halt the current generation? This action cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await handleCancel();
      },
    });
  }

  async function handleRewriteSelection() {
    if (!editor || !selectionText || !rewritePrompt) {
      return;
    }

    const response = await fetch(`/api/documents/${document.id}/revisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId: document.id,
        instruction: rewritePrompt,
        selectionText,
      }),
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
        body: formData,
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
    <div className="editor-shell h-screen overflow-hidden relative">
      <aside className="studio-rail border-r border-[var(--border)]/50 px-5 py-6 md:px-6 bg-[#0A0A0A]/80 backdrop-blur-xl relative z-10 h-full overflow-y-auto pb-10">
        <div className="mb-8 flex">
          <button
            type="button"
            onClick={() => handleNavigation("/")}
            className="group flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[#141414] hover:bg-[#1a1a1a] hover:border-[var(--accent-strong)]/50 text-[var(--text-soft)] hover:text-[var(--accent-strong)] transition-all duration-300 hover:shadow-[0_0_15px_rgba(47,223,160,0.15)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:-translate-x-0.5 transition-transform duration-300"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        </div>
        <div className="space-y-5">
          <div className="border-b border-[var(--border)]/50 pb-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
              Document
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-display text-4xl capitalize text-white">
                {document.contentType.replace("_", " ")}
              </p>
              <StatusBadge status={overallStatus} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Persisted document state with checkpointed version history and
              block-aware generation controls.
            </p>
          </div>

          <div>
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
              Versions
            </p>
            <AppScrollArea className="max-h-[320px] pr-2">
              <div className="space-y-2">
                {sortedVersions.map((version) => (
                  <div
                    key={version.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[#141414] hover:border-[var(--border-strong)] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        v{version.versionNumber}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-soft)]">
                        {formatDate(version.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={version.storageMode} />
                  </div>
                ))}
              </div>
            </AppScrollArea>
          </div>

          <div className="border-t border-[var(--border)]/50 pt-5">
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
              Attachments
            </p>
            <AppScrollArea className="max-h-[260px] pr-2">
              {document.attachments.length ? (
                <div className="space-y-2">
                  {document.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="p-3 rounded-xl border border-[var(--border)] bg-[#141414] hover:border-[var(--border-strong)] transition-colors flex items-center gap-3"
                    >
                      <div className="p-2 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent-strong)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {attachment.filename}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-soft)]">
                          {attachment.mimeType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 text-center">
                  <p className="text-xs text-[var(--text-muted)]">
                    No context files grounded yet.
                  </p>
                </div>
              )}
            </AppScrollArea>
          </div>
        </div>
      </aside>

      <section className="px-5 py-6 md:px-8 relative z-10 h-full flex flex-col min-h-0">
        <div className="mx-auto w-full max-w-5xl flex-1 flex flex-col min-h-0 space-y-5">
          <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-start lg:justify-between shrink-0">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md mb-4">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_8px_var(--accent-strong)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                  Live Workspace
                </span>
              </div>
              <AppTextArea
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                rows={2}
                placeholder="Untitled draft"
                className="studio-title-field text-white"
              />
            </div>
            <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
              <AppButton
                type="button"
                onClick={() => handleNavigation(`/preview/${document.id}`)}
                tone="secondary"
                size="3"
                className="text-xs cursor-pointer"
              >
                Preview View
              </AppButton>
              <AppButton
                type="button"
                onClick={() => handleNavigation("/studio/new")}
                tone="ghost"
                size="3"
                className="text-xs cursor-pointer"
              >
                New
              </AppButton>
            </div>
          </div>

          <div className="relative rounded-2xl border border-[var(--border)] bg-[#0A0A0A] shadow-2xl overflow-hidden group flex-1 flex flex-col min-h-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/50 to-transparent opacity-50" />

            <div className="relative flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]/50 bg-[#0F0F0F] z-10 shrink-0">
              <div className="flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
              </div>
              <div className="ml-auto px-2 py-1 rounded bg-[var(--accent)]/20 border border-[var(--accent)]/30 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse" />
                <span className="text-[9px] uppercase tracking-widest text-[var(--accent-strong)] font-medium">
                  Canvas
                </span>
              </div>
            </div>

            <div className="relative p-6 md:p-10 flex-1 overflow-y-auto prose-editor text-white/90 z-10">
              <EditorContent editor={editor} className="min-h-full" />
            </div>
          </div>
        </div>
      </section>

      <aside className="studio-rail border-l border-[var(--border)]/50 px-5 py-6 md:px-6 bg-[#0A0A0A]/80 backdrop-blur-xl relative z-10 h-full overflow-y-auto pb-10">
        <div className="space-y-6">
          <div>
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
              Intelligence
            </p>
            <div className="p-[1px] rounded-xl bg-gradient-to-b from-[var(--border-strong)] to-[var(--border)] mb-4">
              <div className="bg-[#0A0A0A] rounded-xl p-1">
                <AppTextArea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={5}
                  placeholder="Describe the target outcome..."
                  className="bg-transparent border-none shadow-none text-sm resize-none focus:ring-0"
                />
              </div>
            </div>
            <div className="grid gap-3">
              <AppButton
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || overallStatus === "generating"}
                tone="primary"
                size="3"
                className="w-full text-xs shadow-[0_0_15px_rgba(47,223,160,0.15)]"
              >
                Synthesize Draft
              </AppButton>
              <div className="grid grid-cols-2 gap-3">
                <AppButton
                  type="button"
                  onClick={handleHalt}
                  disabled={!jobId || overallStatus !== "generating"}
                  tone="secondary"
                  size="3"
                  className="text-xs cursor-pointer"
                >
                  Halt
                </AppButton>
                <AppButton
                  asChild
                  tone="secondary"
                  size="3"
                  className="text-xs cursor-pointer"
                >
                  <label>
                    {busyUpload ? "..." : "Grounding File"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </label>
                </AppButton>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)]/50 pt-6">
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
              Micro-Revision
            </p>
            <div className="mb-3 rounded-lg border border-dashed border-[var(--border)] bg-[#141414] p-3 min-h-[60px] max-h-[100px] overflow-y-auto">
              <p className="text-[11px] leading-relaxed text-[var(--text-soft)] italic">
                {selectionText
                  ? `"${selectionText}"`
                  : "Highlight text on canvas to target"}
              </p>
            </div>
            <div className="p-[1px] rounded-xl bg-gradient-to-b from-[var(--border-strong)] to-[var(--border)] mb-3">
              <div className="bg-[#0A0A0A] rounded-xl p-1">
                <AppTextArea
                  value={rewritePrompt}
                  onChange={(event) => setRewritePrompt(event.target.value)}
                  rows={2}
                  placeholder="Refinement instruction..."
                  className="bg-transparent border-none shadow-none text-sm resize-none focus:ring-0"
                />
              </div>
            </div>
            <AppButton
              type="button"
              onClick={handleRewriteSelection}
              disabled={!selectionText || !rewritePrompt.trim()}
              tone="secondary"
              size="3"
              className="w-full text-xs border-[var(--accent)]/30 hover:border-[var(--accent-strong)]/50"
            >
              Apply Mutation
            </AppButton>
          </div>

          <div className="border-t border-[var(--border)]/50 pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
                Stream State
              </p>
              <StatusBadge
                status={
                  completedBlocks === blockEntries.length && blockEntries.length
                    ? "ready"
                    : "streaming"
                }
                label={`${completedBlocks}/${Math.max(blockEntries.length, 1)}`}
                className="text-[9px] px-2 py-0.5"
              />
            </div>
            <AppScrollArea className="max-h-[360px] pr-2">
              {blockEntries.length ? (
                <div className="space-y-2">
                  {blockEntries.map(([blockId, status]) => (
                    <div
                      key={blockId}
                      className="p-3 rounded-xl border border-[var(--border)] bg-[#141414] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${status === "completed" ? "bg-[var(--accent-strong)]" : status === "failed" ? "bg-[#ffb3ad]" : "bg-[#333333] animate-pulse"}`}
                        />
                        <p className="text-xs font-mono text-white truncate">
                          {blockId}
                        </p>
                      </div>
                      <StatusBadge
                        status={status}
                        className="text-[9px] px-1.5 py-0.5"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 text-center">
                  <p className="text-xs text-[var(--text-muted)]">
                    Awaiting synthesis
                  </p>
                </div>
              )}
            </AppScrollArea>
          </div>
        </div>
      </aside>

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-[var(--border)] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-strong)]/50 to-transparent opacity-50" />

            <h3 className="font-display text-2xl text-white mb-3 relative z-10">
              {confirmDialog.title}
            </h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 relative z-10">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3 relative z-10">
              <AppButton
                tone="ghost"
                onClick={() =>
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                }
              >
                Cancel
              </AppButton>
              <AppButton tone="primary" onClick={confirmDialog.onConfirm}>
                Continue
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
