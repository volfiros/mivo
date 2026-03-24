import { compare } from "fast-json-patch";
import type { JSONContent } from "@tiptap/core";

export type StoredVersion = {
  id: string;
  versionNumber: number;
  checkpointVersionNumber: number;
  storageMode: "snapshot" | "checkpoint_patch";
  baseVersionId: string | null;
  fullSnapshotJson: JSONContent | null;
  jsonPatch: unknown[] | null;
};

export function createVersionRecord(params: {
  checkpointBaseVersion: StoredVersion | null;
  currentVersionNumber: number;
  nextDocument: JSONContent;
}) {
  const nextVersionNumber = params.currentVersionNumber + 1;
  const checkpointVersionNumber = Math.floor((nextVersionNumber - 1) / 10) * 10 || 1;

  if (nextVersionNumber === 1 || nextVersionNumber % 10 === 0 || !params.checkpointBaseVersion?.fullSnapshotJson) {
    return {
      versionNumber: nextVersionNumber,
      checkpointVersionNumber: nextVersionNumber,
      storageMode: "snapshot" as const,
      baseVersionId: null,
      fullSnapshotJson: params.nextDocument,
      jsonPatch: null
    };
  }

  const baseSnapshot = params.checkpointBaseVersion.fullSnapshotJson;
  const patch = compare(baseSnapshot, params.nextDocument);

  return {
    versionNumber: nextVersionNumber,
    checkpointVersionNumber,
    storageMode: "checkpoint_patch" as const,
    baseVersionId: params.checkpointBaseVersion.id,
    fullSnapshotJson: null,
    jsonPatch: patch
  };
}
