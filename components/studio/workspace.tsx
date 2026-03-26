"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import type { AuthenticatedUserSummary } from "@/lib/auth-types";
import { buildEditorExtensions } from "@/lib/editor/extensions";
import { AccountMenu } from "@/components/ui/account-menu";
import {
  createEmptyDocument,
  insertPlaceholderNodes,
  replacePlaceholderWithNodes,
  sanitizeDocumentContent,
  updateGeneratedImageSource,
  updatePlaceholderPreview,
} from "@/lib/schema/editor";
import type { ContentType } from "@/lib/schema/content";
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

type DraftHistoryItem = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  updatedAt: string | Date;
};

type DocumentRecord = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  currentVersionId: string | null;
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
      payload: {
        blockId: string;
        delta?: string;
        preview?: string;
        previewKind?: "plain" | "rich_text";
        replace?: boolean;
      };
    }
  | {
      type: "block.completed";
      payload: { blockId: string; nodes: JSONContent[] };
    }
  | {
      type: "block.asset_ready";
      payload: { blockId: string; imageUrl: string };
    }
  | { type: "block.failed"; payload: { blockId: string; error: string } }
  | { type: "generation.completed"; payload: { versionId: string | null } }
  | { type: "generation.cancelled"; payload: Record<string, never> };

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

function cloneContent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function canonicalizeSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const nextItems = value
      .map((item) => canonicalizeSnapshotValue(item))
      .filter((item) => item !== undefined);

    return nextItems;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => [key, canonicalizeSnapshotValue(entryValue)] as const)
      .filter(([key, entryValue]) => {
        if (entryValue === undefined || entryValue === null) {
          return false;
        }

        if (entryValue === "") {
          return false;
        }

        if (
          Array.isArray(entryValue) &&
          entryValue.length === 0 &&
          (key === "marks" || key === "content")
        ) {
          return false;
        }

        if (
          !Array.isArray(entryValue) &&
          typeof entryValue === "object" &&
          Object.keys(entryValue).length === 0
        ) {
          return false;
        }

        return true;
      })
      .sort(([left], [right]) => left.localeCompare(right));

    return Object.fromEntries(entries);
  }

  return value;
}

function createContentSnapshotKey(content: JSONContent, contentType: ContentType) {
  const safeContent = sanitizeDocumentContent(cloneContent(content), contentType);
  return JSON.stringify(canonicalizeSnapshotValue(safeContent));
}

function fillAttr(value: unknown, fallback?: string) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback?.trim() ?? "";
}

function hydrateCompletedNodesFromPreview(
  nodes: JSONContent[],
  cachedPreview?: { preview: string; previewKind: "plain" | "rich_text" },
) {
  if (!nodes.length || !cachedPreview?.preview.trim()) {
    return nodes;
  }

  const sections = cachedPreview.preview
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  if (!sections.length) {
    return nodes;
  }

  return nodes.map((node, index) => {
    if (index !== 0 || !node.attrs || typeof node.type !== "string") {
      return node;
    }

    switch (node.type) {
      case "ctaBanner":
        return {
          ...node,
          attrs: {
            ...node.attrs,
            title: fillAttr(node.attrs.title, sections[0]),
            body: fillAttr(node.attrs.body, sections[1]),
            actionLabel: fillAttr(node.attrs.actionLabel, sections[2] ?? sections[0]),
          },
        };
      case "heroSection":
        return {
          ...node,
          attrs: {
            ...node.attrs,
            title: fillAttr(node.attrs.title, sections[0]),
            subtitle: fillAttr(node.attrs.subtitle, sections[1]),
            actionLabel: fillAttr(node.attrs.actionLabel, sections[2]),
          },
        };
      case "twoColumn":
        return {
          ...node,
          attrs: {
            ...node.attrs,
            leftTitle: fillAttr(node.attrs.leftTitle, sections[0]),
            leftBody: fillAttr(node.attrs.leftBody, sections[1]),
            rightTitle: fillAttr(node.attrs.rightTitle, sections[2]),
            rightBody: fillAttr(node.attrs.rightBody, sections[3]),
          },
        };
      case "imageWithCopy":
        return {
          ...node,
          attrs: {
            ...node.attrs,
            title: fillAttr(node.attrs.title, sections[0]),
            body: fillAttr(node.attrs.body, sections[1]),
          },
        };
      case "calloutBlock":
        return {
          ...node,
          attrs: {
            ...node.attrs,
            label: fillAttr(node.attrs.label, sections[0]),
            body: fillAttr(node.attrs.body, sections[1]),
          },
        };
      case "quoteBlock":
        return {
          ...node,
          attrs: {
            ...node.attrs,
            quote: fillAttr(node.attrs.quote, sections[0]),
            attribution: fillAttr(node.attrs.attribution, sections[1]),
          },
        };
      case "featureGrid": {
        const pairs = [];

        for (let cursor = 0; cursor < sections.length; cursor += 2) {
          pairs.push([sections[cursor], sections[cursor + 1]]);
        }

        return {
          ...node,
          attrs: {
            ...node.attrs,
            item1Title: fillAttr(node.attrs.item1Title, pairs[0]?.[0]),
            item1Body: fillAttr(node.attrs.item1Body, pairs[0]?.[1]),
            item2Title: fillAttr(node.attrs.item2Title, pairs[1]?.[0]),
            item2Body: fillAttr(node.attrs.item2Body, pairs[1]?.[1]),
            item3Title: fillAttr(node.attrs.item3Title, pairs[2]?.[0]),
            item3Body: fillAttr(node.attrs.item3Body, pairs[2]?.[1]),
            item4Title: fillAttr(node.attrs.item4Title, pairs[3]?.[0]),
            item4Body: fillAttr(node.attrs.item4Body, pairs[3]?.[1]),
          },
        };
      }
      default:
        return node;
    }
  });
}

export function Workspace({
  document,
  draftHistory,
  user,
}: {
  document: DocumentRecord;
  draftHistory: DraftHistoryItem[];
  user: AuthenticatedUserSummary;
}) {
  const router = useRouter();
  const streamRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCacheRef = useRef<
    Record<string, { preview: string; previewKind: "plain" | "rich_text" }>
  >({});
  const generationBaseContentRef = useRef<JSONContent | null>(null);
  const contentType = document.contentType as ContentType;
  const [archiveItems, setArchiveItems] = useState(draftHistory);
  const [serverTitle, setServerTitle] = useState(document.title);
  const [title, setTitle] = useState(document.title);
  const [prompt, setPrompt] = useState("");
  const [rewritePrompt, setRewritePrompt] = useState("");
  const [savedContentSnapshotKey, setSavedContentSnapshotKey] = useState(() =>
    createContentSnapshotKey(document.currentContentJson, contentType),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [rewritingSelection, setRewritingSelection] = useState(false);
  const [cancellingGeneration, setCancellingGeneration] = useState(false);
  const [overallStatus, setOverallStatus] = useState(document.status);
  const [attachmentIds, setAttachmentIds] = useState<string[]>(
    document.attachments.map((attachment) => attachment.id),
  );
  const [latestVersionId, setLatestVersionId] = useState<string | null>(
    document.currentVersionId,
  );
  const [latestVersionNumber, setLatestVersionNumber] = useState<number | null>(
    document.versions.find((version) => version.id === document.currentVersionId)
      ?.versionNumber ?? null,
  );
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    document.currentVersionId,
  );
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(
    document.versions.find((version) => version.id === document.currentVersionId)
      ?.versionNumber ?? null,
  );
  const [versionLoadError, setVersionLoadError] = useState("");
  const [saveVersionError, setSaveVersionError] = useState("");
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<Record<string, string>>({});
  const [selectionText, setSelectionText] = useState("");
  const [busyUpload, setBusyUpload] = useState(false);
  const [isLeftRailOpen, setIsLeftRailOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const isViewingHistoricalVersion =
    activeVersionId !== null && activeVersionId !== latestVersionId;
  const previousLatestVersionIdRef = useRef<string | null>(document.currentVersionId);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildEditorExtensions(contentType),
    content: sanitizeDocumentContent(document.currentContentJson, contentType),
    enableContentCheck: true,
    onContentError: ({ error }) => {
      setVersionLoadError(`Unable to render the canvas: ${error.message}`);
    },
  }, [contentType]);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    setArchiveItems(draftHistory);
  }, [draftHistory]);

  useEffect(() => {
    if (document.title === serverTitle) {
      return;
    }

    setServerTitle(document.title);
    setTitle(document.title);
  }, [document.title, serverTitle]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextEditable = activeVersionId === latestVersionId;
    const timeoutId = window.setTimeout(() => {
      editor.setEditable(nextEditable);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeVersionId, latestVersionId, editor]);

  useEffect(() => {
    const nextLatestVersionId = document.currentVersionId;
    const nextLatestVersionNumber =
      document.versions.find((version) => version.id === document.currentVersionId)
        ?.versionNumber ?? null;
    const nextSavedContentSnapshotKey = createContentSnapshotKey(
      document.currentContentJson,
      contentType,
    );

    setLatestVersionId(nextLatestVersionId);
    setLatestVersionNumber(nextLatestVersionNumber);

    if (!isViewingHistoricalVersion) {
      setSavedContentSnapshotKey(nextSavedContentSnapshotKey);
      setActiveVersionId(nextLatestVersionId);
      setActiveVersionNumber(
        nextLatestVersionNumber,
      );
      setVersionLoadError("");
    }
  }, [
    contentType,
    document.currentVersionId,
    document.currentContentJson,
    document.versions,
    isViewingHistoricalVersion,
  ]);

  useEffect(() => {
    if (!editor || isViewingHistoricalVersion) {
      setIsDirty(false);
      return;
    }

    const updateDirtyState = () => {
      setIsDirty(
        createContentSnapshotKey(editor.getJSON(), contentType) !== savedContentSnapshotKey,
      );
    };

    updateDirtyState();
    editor.on("update", updateDirtyState);

    return () => {
      editor.off("update", updateDirtyState);
    };
  }, [contentType, editor, isViewingHistoricalVersion, savedContentSnapshotKey]);

  useEffect(() => {
    if (!editor || isViewingHistoricalVersion) {
      return;
    }

    setIsDirty(
      createContentSnapshotKey(editor.getJSON(), contentType) !== savedContentSnapshotKey,
    );
  }, [contentType, editor, isViewingHistoricalVersion, savedContentSnapshotKey]);

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

  function pushRoute(target: string) {
    router.push(target as Route);
  }

  function getCurrentDraft() {
    return {
      title,
      content: editor?.getJSON() ?? document.currentContentJson,
    };
  }

  function closeConfirmDialog() {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  }

  function requestDiscardUnsaved(message: string, onConfirm: () => void | Promise<void>) {
    setConfirmDialog({
      isOpen: true,
      title: "Discard Unsaved Changes",
      message,
      onConfirm: async () => {
        closeConfirmDialog();
        await onConfirm();
      },
    });
  }

  function closeActiveStream() {
    streamRef.current?.close();
    streamRef.current = null;
  }

  const applyCanvasContent = useCallback((nextContent: JSONContent, context: string) => {
    if (!editor) {
      return false;
    }

    try {
      const safeContent = sanitizeDocumentContent(cloneContent(nextContent), contentType);

      editor.commands.setContent(
        safeContent,
        false,
        {
          preserveWhitespace: "full",
        },
        {
          errorOnInvalidContent: true,
        },
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown editor error";
      setVersionLoadError(`Unable to render ${context} in the canvas: ${message}`);
      editor.commands.setContent(createEmptyDocument(), false);
      return false;
    }
  }, [contentType, editor]);

  const restoreCanvasAfterCancellation = useCallback(() => {
    previewCacheRef.current = {};
    setBlockStatus({});
    setJobId(null);

    const baseContent = generationBaseContentRef.current;
    generationBaseContentRef.current = null;

    if (baseContent) {
      applyCanvasContent(baseContent, "the halted draft");
    }
  }, [applyCanvasContent]);

  function updatePlaceholderPreviewInEditor(
    blockId: string,
    preview: string,
    status = "streaming",
    previewKind: "plain" | "rich_text" = "plain",
  ) {
    if (!editor) {
      return false;
    }

    let targetPosition: number | null = null;
    let targetAttrs: Record<string, unknown> | null = null;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "aiPlaceholder" && node.attrs.blockId === blockId) {
        targetPosition = pos;
        targetAttrs = node.attrs as Record<string, unknown>;
        return false;
      }

      return true;
    });

    if (targetPosition === null || !targetAttrs) {
      return false;
    }

    try {
      const nextAttrs = targetAttrs as Record<string, unknown>;
      const transaction = editor.state.tr
        .setMeta("addToHistory", false)
        .setNodeMarkup(targetPosition, undefined, {
          ...nextAttrs,
          preview,
          previewKind,
          status,
        });

      editor.view.dispatch(transaction);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown editor error";
      setVersionLoadError(`Unable to update block preview ${blockId}: ${message}`);
      return false;
    }
  }

  function replacePlaceholderWithNodesInEditor(
    blockId: string,
    nodes: JSONContent[],
  ) {
    if (!editor) {
      return false;
    }

    let targetPosition: number | null = null;
    let targetSize = 0;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "aiPlaceholder" && node.attrs.blockId === blockId) {
        targetPosition = pos;
        targetSize = node.nodeSize;
        return false;
      }

      return true;
    });

    if (targetPosition === null) {
      return false;
    }

    try {
      const replacementNodes = nodes.map((node) =>
        editor.state.schema.nodeFromJSON(cloneContent(node)),
      );
      const transaction = editor.state.tr
        .setMeta("addToHistory", false)
        .replaceWith(
          targetPosition,
          targetPosition + targetSize,
          replacementNodes,
        );

      editor.view.dispatch(transaction);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown editor error";
      setVersionLoadError(`Unable to finalize block ${blockId}: ${message}`);
      return false;
    }
  }

  function updateGeneratedImageInEditor(blockId: string, imageUrl: string) {
    if (!editor) {
      return false;
    }

    let targetPosition: number | null = null;
    let targetAttrs: Record<string, unknown> | null = null;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "generatedImage" && node.attrs.blockId === blockId) {
        targetPosition = pos;
        targetAttrs = node.attrs as Record<string, unknown>;
        return false;
      }

      return true;
    });

    if (targetPosition === null || !targetAttrs) {
      return false;
    }

    try {
      const nextAttrs = targetAttrs as Record<string, unknown>;
      const transaction = editor.state.tr
        .setMeta("addToHistory", false)
        .setNodeMarkup(targetPosition, undefined, {
          ...nextAttrs,
          src: imageUrl,
        });

      editor.view.dispatch(transaction);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown editor error";
      setVersionLoadError(`Unable to update generated image ${blockId}: ${message}`);
      return false;
    }
  }

  function renderBusyButtonLabel(label: string) {
    return (
      <span className="inline-flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="animate-spin"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="2"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>{label}</span>
      </span>
    );
  }

  const resetDirtyStateToCurrentCanvas = useCallback(() => {
    if (!editor) {
      return;
    }

    const nextSnapshotKey = createContentSnapshotKey(editor.getJSON(), contentType);
    setSavedContentSnapshotKey(nextSnapshotKey);
    setIsDirty(false);
  }, [contentType, editor]);

  useEffect(() => {
    if (!editor || isViewingHistoricalVersion) {
      previousLatestVersionIdRef.current = document.currentVersionId;
      return;
    }

    const previousLatestVersionId = previousLatestVersionIdRef.current;
    previousLatestVersionIdRef.current = document.currentVersionId;

    if (
      !document.currentVersionId ||
      document.currentVersionId === previousLatestVersionId
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (applyCanvasContent(document.currentContentJson, "the latest version")) {
        window.setTimeout(() => {
          resetDirtyStateToCurrentCanvas();
        }, 0);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    applyCanvasContent,
    document.currentVersionId,
    document.currentContentJson,
    editor,
    isViewingHistoricalVersion,
    resetDirtyStateToCurrentCanvas,
  ]);

  async function handleSaveTitle() {
    if (title === serverTitle || isViewingHistoricalVersion) return;
    setSavingTitle(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error("Failed to save title");

      setServerTitle(title);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleCreateVersion() {
    if (!editor || isViewingHistoricalVersion || savingVersion) {
      return;
    }

    const draft = getCurrentDraft();

    if (createContentSnapshotKey(draft.content, contentType) === savedContentSnapshotKey) {
      return;
    }

    setSavingVersion(true);
    setSaveVersionError("");

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: draft.content,
        }),
      });
      const payload = (await response.json()) as {
        versionId?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create version");
      }

      const nextVersionId = payload.versionId ?? latestVersionId;
      const nextVersionNumber =
        Math.max(
          latestVersionNumber ?? -1,
          ...document.versions.map((version) => version.versionNumber),
        ) + 1;

      setLatestVersionId(nextVersionId);
      setLatestVersionNumber(nextVersionNumber);
      setActiveVersionId(nextVersionId);
      setActiveVersionNumber(nextVersionNumber);
      resetDirtyStateToCurrentCanvas();
      router.refresh();
    } catch (error) {
      setSaveVersionError(
        error instanceof Error ? error.message : "Unable to create version.",
      );
    } finally {
      setSavingVersion(false);
    }
  }

  async function handleGenerate() {
    if (
      !editor ||
      savingVersion ||
      isViewingHistoricalVersion ||
      startingGeneration
    ) {
      return;
    }

    setStartingGeneration(true);
    setVersionLoadError("");
    generationBaseContentRef.current = cloneContent(editor.getJSON());

    try {
      const draft = getCurrentDraft();
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
          title: draft.title,
          draftContent: draft.content,
        }),
      });
      const payload = (await response.json()) as {
        jobId?: string;
        error?: string;
      };

      if (!response.ok || !payload.jobId) {
        throw new Error(payload.error ?? "Unable to start generation");
      }

      setJobId(payload.jobId);
      setOverallStatus("generating");
      subscribeToStream(payload.jobId);
    } catch (error) {
      setVersionLoadError(
        error instanceof Error ? error.message : "Unable to start generation.",
      );
      setOverallStatus("ready");
      generationBaseContentRef.current = null;
    } finally {
      setStartingGeneration(false);
    }
  }

  async function handleLoadVersion(version: VersionRecord) {
    if (!editor) {
      return;
    }

    if (version.id === latestVersionId) {
      setActiveVersionId(latestVersionId);
      setActiveVersionNumber(latestVersionNumber ?? version.versionNumber);
      setVersionLoadError("");
      setSaveVersionError("");
      setBlockStatus({});
      setTitle(document.title);
      window.setTimeout(() => {
        if (applyCanvasContent(document.currentContentJson, "the latest version")) {
          window.setTimeout(() => {
            resetDirtyStateToCurrentCanvas();
          }, 0);
        }
      }, 0);
      return;
    }

    setLoadingVersionId(version.id);
    setVersionLoadError("");

    try {
      const response = await fetch(
        `/api/documents/${document.id}/versions/${version.id}`,
      );
      const payload = (await response.json()) as {
        version?: { content?: JSONContent; versionNumber?: number };
        error?: string;
      };

      if (!response.ok || !payload.version?.content) {
        throw new Error(payload.error ?? "Unable to load version");
      }

      setActiveVersionId(version.id);
      setActiveVersionNumber(
        payload.version.versionNumber ?? version.versionNumber,
      );
      setTitle(document.title);
      setSaveVersionError("");
      setBlockStatus({});
      setIsDirty(false);
      applyCanvasContent(payload.version.content, `version ${version.versionNumber}`);
    } catch (error) {
      setVersionLoadError(
        error instanceof Error ? error.message : "Unable to load version.",
      );
    } finally {
      setLoadingVersionId(null);
    }
  }

  function requestLoadVersion(version: VersionRecord) {
    if (overallStatus === "generating") {
      return;
    }

    if (isDirty && !isViewingHistoricalVersion) {
      requestDiscardUnsaved(
        "You have unsaved canvas changes. Loading another version will discard them.",
        () => {
          setIsProcessing(true);
          return handleLoadVersion(version).finally(() => setIsProcessing(false));
        },
      );
      return;
    }

    setIsProcessing(true);
    handleLoadVersion(version).finally(() => setIsProcessing(false));
  }

  function subscribeToStream(nextJobId: string) {
    closeActiveStream();

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
        previewCacheRef.current = {};
        const nextDoc = insertPlaceholderNodes(
          editor.getJSON(),
          parsed.payload.placeholders,
          contentType,
        );
        setBlockStatus(
          Object.fromEntries(
            parsed.payload.placeholders.map((placeholder) => [
              placeholder.blockId,
              "queued",
            ]),
          ),
        );
        applyCanvasContent(nextDoc, "the generated outline");
      }

      if (parsed.type === "block.preview_delta") {
        const previousPreview =
          previewCacheRef.current[parsed.payload.blockId]?.preview ?? "";
        const nextPreview =
          typeof parsed.payload.preview === "string"
            ? parsed.payload.preview
            : parsed.payload.replace
              ? (parsed.payload.delta ?? "")
              : previousPreview + (parsed.payload.delta ?? "");
        const nextPreviewKind = parsed.payload.previewKind ?? "plain";

        previewCacheRef.current[parsed.payload.blockId] = {
          preview: nextPreview,
          previewKind: nextPreviewKind,
        };
        setBlockStatus((current) => {
          if (current[parsed.payload.blockId] === "streaming") {
            return current;
          }

          return {
            ...current,
            [parsed.payload.blockId]: "streaming",
          };
        });
        if (
          !updatePlaceholderPreviewInEditor(
            parsed.payload.blockId,
            nextPreview,
            "streaming",
            nextPreviewKind,
          )
        ) {
          applyCanvasContent(
            updatePlaceholderPreview(
              editor.getJSON(),
              parsed.payload.blockId,
              nextPreview,
              "streaming",
              nextPreviewKind,
              contentType,
            ),
            `block preview ${parsed.payload.blockId}`,
          );
        }
      }

      if (parsed.type === "block.completed") {
        const hydratedNodes = hydrateCompletedNodesFromPreview(
          parsed.payload.nodes,
          previewCacheRef.current[parsed.payload.blockId],
        );
        setBlockStatus((current) => ({
          ...current,
          [parsed.payload.blockId]: "completed",
        }));
        if (
          !replacePlaceholderWithNodesInEditor(
            parsed.payload.blockId,
            hydratedNodes,
          )
        ) {
          applyCanvasContent(
            replacePlaceholderWithNodes(
              editor.getJSON(),
              parsed.payload.blockId,
              hydratedNodes,
              contentType,
            ),
            `block ${parsed.payload.blockId}`,
          );
        }
        delete previewCacheRef.current[parsed.payload.blockId];
      }

      if (parsed.type === "block.asset_ready") {
        if (
          !updateGeneratedImageInEditor(
            parsed.payload.blockId,
            parsed.payload.imageUrl,
          )
        ) {
          applyCanvasContent(
            updateGeneratedImageSource(
              editor.getJSON(),
              parsed.payload.blockId,
              parsed.payload.imageUrl,
              contentType,
            ),
            `generated image ${parsed.payload.blockId}`,
          );
        }
      }

      if (parsed.type === "block.failed") {
        if (parsed.payload.blockId === "__generation__") {
          setVersionLoadError(parsed.payload.error);
          setOverallStatus("failed");
          previewCacheRef.current = {};
          closeActiveStream();
          return;
        }

        setVersionLoadError(
          `Section ${parsed.payload.blockId} failed: ${parsed.payload.error}`,
        );
        previewCacheRef.current[parsed.payload.blockId] = {
          preview: parsed.payload.error,
          previewKind: "plain",
        };
        setBlockStatus((current) => ({
          ...current,
          [parsed.payload.blockId]: "failed",
        }));
        if (
          !updatePlaceholderPreviewInEditor(
            parsed.payload.blockId,
            parsed.payload.error,
            "failed",
          )
        ) {
          applyCanvasContent(
            updatePlaceholderPreview(
              editor.getJSON(),
              parsed.payload.blockId,
              parsed.payload.error,
              "failed",
              undefined,
              contentType,
            ),
            `failed block ${parsed.payload.blockId}`,
          );
        }
      }

      if (parsed.type === "generation.completed") {
        setOverallStatus("ready");
        setActiveVersionId(latestVersionId);
        setActiveVersionNumber(latestVersionNumber);
        previewCacheRef.current = {};
        generationBaseContentRef.current = null;
        setJobId(null);
        closeActiveStream();
        if (parsed.payload.versionId) {
          router.refresh();
        }
      }

      if (parsed.type === "generation.cancelled") {
        setOverallStatus("cancelled");
        restoreCanvasAfterCancellation();
        closeActiveStream();
      }
    };
  }

  async function handleCancel() {
    if (!jobId) {
      return;
    }

    setCancellingGeneration(true);

    try {
      await fetch(`/api/generations/${jobId}/cancel`, {
        method: "POST",
      });

      setOverallStatus("cancelled");
      restoreCanvasAfterCancellation();
      closeActiveStream();
    } finally {
      setCancellingGeneration(false);
    }
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
          pushRoute(target);
        },
      });
    } else if (isDirty && !isViewingHistoricalVersion) {
      requestDiscardUnsaved(
        "You have unsaved canvas changes. Leaving now will discard them and open the latest saved version.",
        () => {
          pushRoute(target);
        },
      );
    } else {
      pushRoute(target);
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
    if (!editor || !selectionText || !rewritePrompt || isViewingHistoricalVersion) {
      return;
    }

    setRewritingSelection(true);

    try {
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
    } finally {
      setRewritingSelection(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || isViewingHistoricalVersion) {
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

  async function handleDeleteDraft(draftId: string) {
    setIsProcessing(true);
    setDeletingDraftId(draftId);
    setVersionLoadError("");

    try {
      const response = await fetch(`/api/documents/${draftId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        nextPath?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to delete draft");
      }

      if (draftId === document.id) {
        pushRoute(payload.nextPath ?? "/studio/new");
        return;
      }

      setArchiveItems((current) =>
        current.filter((draft) => draft.id !== draftId),
      );
    } catch (error) {
      setVersionLoadError(
        error instanceof Error ? error.message : "Unable to delete draft.",
      );
    } finally {
      setDeletingDraftId(null);
      setIsProcessing(false);
    }
  }

  function requestDeleteDraft(draft: DraftHistoryItem) {
    const message =
      draft.id === document.id
        ? "Delete this draft and leave the workspace? This will remove the current document and its saved versions."
        : "Delete this draft and all of its saved versions?";

    setConfirmDialog({
      isOpen: true,
      title: "Delete Draft",
      message,
      onConfirm: async () => {
        closeConfirmDialog();
        await handleDeleteDraft(draft.id);
      },
    });
  }

  return (
    <div className="editor-shell h-screen overflow-hidden relative">
      {isProcessing ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/60 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-t-2 border-[var(--accent-strong)] animate-spin mb-4" />
            <p className="text-sm font-semibold text-[var(--accent-strong)] tracking-widest uppercase animate-pulse">Processing...</p>
          </div>
        </div>
      ) : null}
      {isLeftRailOpen ? (
        <>
          <button
            type="button"
            aria-label="Close workspace menu"
            onClick={() => setIsLeftRailOpen(false)}
            className="absolute inset-0 z-30 bg-black/45 backdrop-blur-[2px]"
          />
          <aside className="studio-rail absolute inset-y-0 left-0 z-40 w-[360px] max-w-[calc(100vw-1.5rem)] border-r border-[var(--border)]/50 px-5 py-6 md:px-6 bg-[#0A0A0A]/92 backdrop-blur-xl overflow-y-auto pb-10 shadow-[24px_0_60px_rgba(0,0,0,0.45)]">
      <div className="mb-8 flex items-center justify-between gap-3">
          <div />
          <button
            type="button"
            onClick={() => setIsLeftRailOpen(false)}
            className="group flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[#141414] hover:bg-[#1a1a1a] hover:border-[var(--accent-strong)]/50 text-[var(--text-soft)] hover:text-[var(--accent-strong)] transition-all duration-300"
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
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
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
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Persisted document state with checkpointed version history and
              block-aware generation controls.
            </p>
            {versionLoadError ? (
              <p className="mt-3 text-sm text-[rgb(255,179,173)]">
                {versionLoadError}
              </p>
            ) : null}
            {saveVersionError ? (
              <p className="mt-3 text-sm text-[rgb(255,179,173)]">
                {saveVersionError}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
                Draft Archive
              </p>
            </div>
            <AppScrollArea className="max-h-[280px]">
              {archiveItems.length ? (
                <div className="space-y-2">
                  {archiveItems.map((draft) => {
                    const isActive = draft.id === document.id;
                    return (
                      <div
                        key={draft.id}
                        className={`group relative box-border grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_40px] items-stretch overflow-hidden rounded-xl border transition-all duration-300 ${
                          isActive
                            ? "border-[var(--accent-strong)]/35 bg-[#0A0A0A] shadow-[0_0_15px_rgba(47,223,160,0.05)]"
                            : "border-[var(--border)]/50 bg-[#0A0A0A] hover:bg-[#141414] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        {isActive && (
                          <>
                            <div className="pointer-events-none absolute inset-y-0 left-0 right-[40px] z-0 rounded-xl bg-[var(--accent)]/12" />
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[4px] rounded-full bg-gradient-to-b from-[var(--accent-strong)] to-[var(--accent)]" />
                          </>
                        )}
                        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent-strong)]/6 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNavigation(`/studio/${draft.id}`)}
                          className={`relative z-20 min-w-0 overflow-hidden px-3.5 py-3 text-left ${isActive ? "pl-6" : ""}`}
                        >
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <p
                              className={`min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap pr-2 text-sm font-semibold tracking-tight transition-colors ${isActive ? "text-[var(--accent-strong)]" : "text-[var(--text-soft)] group-hover:text-white"}`}
                              title={draft.title}
                            >
                              {draft.title}
                            </p>
                            <StatusBadge
                              status={draft.status}
                              className="text-[9px] px-1.5 py-0.5 shrink-0 shadow-sm"
                            />
                          </div>
                          <div
                            className="mt-2 flex min-w-0 items-center gap-2"
                          >
                            <span className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[#141414] text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                              {draft.contentType.replace("_", " ")}
                            </span>
                            <p className="truncate text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                              {formatDate(draft.updatedAt).split(" ")[0]}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteDraft(draft)}
                          disabled={
                            deletingDraftId === draft.id ||
                            (isActive && overallStatus === "generating")
                          }
                          className={`relative z-20 flex min-w-0 items-center justify-center self-stretch border-l text-[var(--text-soft)] transition-colors hover:text-[rgb(255,179,173)] disabled:cursor-not-allowed disabled:opacity-50 ${
                            isActive
                              ? "border-[var(--accent-strong)]/20 bg-[#111111] hover:bg-[#171717]"
                              : "border-[var(--border)]/70 bg-[#111111] hover:bg-[#171717]"
                          }`}
                          aria-label={`Delete ${draft.title}`}
                        >
                          {deletingDraftId === draft.id ? (
                            <span className="text-[10px] font-mono">...</span>
                          ) : (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                              <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-[var(--border)]/50 bg-[#0A0A0A] text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--accent-strong)_0%,transparent_100%)] opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500" />
                  <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
                    No Archive Records
                  </p>
                </div>
              )}
            </AppScrollArea>
          </div>

          <div className="border-t border-[var(--border)]/50 pt-5">
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--text-soft)]">
              Versions
            </p>
            <AppScrollArea className="max-h-[320px] pr-2">
              <div className="space-y-2">
                {sortedVersions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => {
                      requestLoadVersion(version);
                    }}
                    disabled={
                      loadingVersionId === version.id ||
                      overallStatus === "generating"
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      activeVersionId === version.id
                        ? "border-[var(--accent-strong)]/40 bg-[var(--accent)]/10"
                        : "border-[var(--border)] bg-[#141414] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        v{version.versionNumber}
                        {version.id === latestVersionId ? " current" : ""}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-soft)]">
                        {formatDate(version.createdAt)}
                      </p>
                    </div>
                    <StatusBadge
                      status={loadingVersionId === version.id ? "generating" : version.storageMode}
                      label={loadingVersionId === version.id ? "loading" : undefined}
                    />
                  </button>
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
                      className="group relative box-border grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border border-[var(--border)]/50 bg-[#0A0A0A] transition-all duration-300 hover:bg-[#141414] hover:border-[var(--border-strong)]"
                    >
                      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent-strong)]/6 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </div>
                      <div className="relative z-20 min-w-0 overflow-hidden px-3.5 py-3 text-left">
                        <div className="flex min-w-0 items-start gap-3">
                        <div className="shrink-0 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-2">
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
                          <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <p
                                className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap pr-2 text-sm font-semibold tracking-tight text-[var(--text-soft)] transition-colors group-hover:text-white"
                              title={attachment.filename}
                            >
                              {attachment.filename}
                            </p>
                            <StatusBadge
                              status="ready"
                              label="grounded"
                              className="shrink-0 px-1.5 py-0.5 text-[9px] shadow-sm"
                            />
                          </div>
                          <div className="mt-2 flex min-w-0 items-center gap-2">
                            <span className="rounded border border-[var(--border)] bg-[#141414] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                              {attachment.mimeType}
                            </span>
                            <p className="truncate text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                              {formatDate(attachment.createdAt).split(" ")[0]}
                            </p>
                          </div>
                        </div>
                        </div>
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
        </>
      ) : null}

      <section className="px-5 py-6 md:px-8 relative z-10 h-full flex flex-col min-h-0">
        <div className="w-full flex-1 flex flex-col min-h-0 space-y-5">
          <div className="flex flex-col gap-4 pb-2 shrink-0 w-full">
            <div className="min-w-0 flex-1 w-full">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/")}
                    className="group flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[#141414] text-[var(--text-soft)] transition-all duration-300 hover:border-[var(--accent-strong)]/40 hover:bg-[#1a1a1a] hover:text-[var(--accent-strong)]"
                    aria-label="Back to studio"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform duration-300 group-hover:-translate-x-0.5"
                    >
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLeftRailOpen(true)}
                    className="group flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[#141414] text-[var(--text-soft)] transition-all duration-300 hover:border-[var(--accent-strong)]/40 hover:bg-[#1a1a1a] hover:text-[var(--accent-strong)]"
                    aria-label="Open workspace menu"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                  </button>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-strong)] animate-pulse shadow-[0_0_8px_var(--accent-strong)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                      Live Workspace
                    </span>
                  </div>
                </div>
                <AccountMenu
                  user={user}
                  disabled={overallStatus === "generating" || savingVersion}
                />
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[var(--border)] bg-[#111111] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-soft)]">
                  {document.contentType.replace("_", " ")}
                </span>
                <StatusBadge status={overallStatus} />
                {isViewingHistoricalVersion && activeVersionNumber !== null ? (
                  <StatusBadge
                    status="ready"
                    label={`viewing v${activeVersionNumber}`}
                  />
                ) : null}
                {isDirty && !isViewingHistoricalVersion ? (
                  <StatusBadge status="queued" label="unsaved" />
                ) : null}
              </div>
              <div className="w-full min-w-0 flex items-center gap-4">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Untitled draft"
                    disabled={isViewingHistoricalVersion}
                    spellCheck={false}
                    className="studio-title-field text-white"
                  />
                </div>
                {title !== serverTitle && !isViewingHistoricalVersion && (
                  <AppButton
                    type="button"
                    onClick={() => {
                      void handleSaveTitle();
                    }}
                    disabled={savingTitle}
                    aria-busy={savingTitle}
                    tone="secondary"
                    size="1"
                    className="shrink-0 text-[10px] uppercase tracking-wider h-7 px-3 bg-[var(--surface-2)]/50 hover:bg-[var(--accent-strong)]/20 hover:text-[var(--accent-strong)] hover:border-[var(--accent-strong)]/50 transition-colors"
                  >
                    {savingTitle ? renderBusyButtonLabel("Saving...") : "Save Title"}
                  </AppButton>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 items-center shrink-0 w-full">
              <AppButton
                type="button"
                onClick={() => {
                  void handleCreateVersion();
                }}
                disabled={
                  !isDirty ||
                  savingVersion ||
                  isViewingHistoricalVersion ||
                  overallStatus === "generating"
                }
                aria-busy={savingVersion}
                tone="primary"
                size="3"
                className="text-xs cursor-pointer"
              >
                {savingVersion
                  ? renderBusyButtonLabel("Creating...")
                  : "Create Version"}
              </AppButton>
              <AppButton
                type="button"
                onClick={() =>
                  handleNavigation(
                    isViewingHistoricalVersion && activeVersionId
                      ? `/preview/${document.id}?version=${activeVersionId}`
                      : `/preview/${document.id}`,
                  )
                }
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

            <div className="relative flex-1 overflow-y-auto p-6 pb-24 md:p-10 md:pb-28 prose-editor text-white/90 z-10">
              {isViewingHistoricalVersion && activeVersionNumber !== null ? (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[#111111] px-4 py-3 text-sm text-[var(--text-soft)]">
                  <p>
                    Viewing snapshot <span className="text-white">v{activeVersionNumber}</span>.
                    Return to the latest draft to edit or generate.
                  </p>
                  {latestVersionId ? (
                    <AppButton
                      type="button"
                      tone="ghost"
                      size="2"
                      className="text-xs"
                      onClick={() => {
                        setActiveVersionId(latestVersionId);
                        setActiveVersionNumber(latestVersionNumber);
                        setTitle(document.title);
                        setVersionLoadError("");
                        setSaveVersionError("");
                        setBlockStatus({});
                        window.setTimeout(() => {
                          applyCanvasContent(
                            document.currentContentJson,
                            "the latest version",
                          );
                          window.setTimeout(() => {
                            resetDirtyStateToCurrentCanvas();
                          }, 0);
                        }, 0);
                      }}
                    >
                      Return to Latest
                    </AppButton>
                  ) : null}
                </div>
              ) : null}
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
                disabled={
                  !prompt.trim() ||
                  overallStatus === "generating" ||
                  isViewingHistoricalVersion ||
                  savingVersion ||
                  startingGeneration
                }
                aria-busy={startingGeneration}
                tone="primary"
                size="3"
                className="w-full text-xs shadow-[0_0_15px_rgba(47,223,160,0.15)]"
              >
                {startingGeneration
                  ? renderBusyButtonLabel("Starting...")
                  : "Synthesize Draft"}
              </AppButton>
              <div className="grid grid-cols-2 gap-3">
                <AppButton
                  type="button"
                  onClick={handleHalt}
                  disabled={
                    !jobId ||
                    overallStatus !== "generating" ||
                    isViewingHistoricalVersion ||
                    savingVersion ||
                    cancellingGeneration
                  }
                  aria-busy={cancellingGeneration}
                  tone="secondary"
                  size="3"
                  className="text-xs cursor-pointer"
                >
                  {cancellingGeneration
                    ? renderBusyButtonLabel("Halting...")
                    : "Halt"}
                </AppButton>
                <AppButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    busyUpload || isViewingHistoricalVersion || savingVersion
                  }
                  aria-busy={busyUpload}
                  tone="secondary"
                  size="3"
                  className="text-xs cursor-pointer"
                >
                  {busyUpload
                    ? renderBusyButtonLabel("Grounding...")
                    : "Grounding File"}
                </AppButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  disabled={busyUpload || isViewingHistoricalVersion || savingVersion}
                  onChange={handleUpload}
                />
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
                  disabled={isViewingHistoricalVersion || savingVersion}
                  placeholder="Refinement instruction..."
                  className="bg-transparent border-none shadow-none text-sm resize-none focus:ring-0"
                />
              </div>
            </div>
            <AppButton
              type="button"
              onClick={handleRewriteSelection}
              disabled={
                !selectionText ||
                !rewritePrompt.trim() ||
                isViewingHistoricalVersion ||
                savingVersion ||
                rewritingSelection
              }
              aria-busy={rewritingSelection}
              tone="secondary"
              size="3"
              className="w-full text-xs border-[var(--accent)]/30 hover:border-[var(--accent-strong)]/50"
            >
              {rewritingSelection
                ? renderBusyButtonLabel("Applying...")
                : "Apply Mutation"}
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
        <div className="motion-fade-in-fast fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="motion-fade-in-fast motion-scale-in-fast bg-[#0A0A0A] border border-[var(--border)] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
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
