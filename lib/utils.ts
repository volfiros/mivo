/**
 * Ensure a value is a non-empty trimmed string, falling back to an alternative.
 *
 * This replaces the scattered `ensureText`, `fillText`, and `fillAttr`
 * helpers that were duplicated across editor, preview, workspace, and
 * stream code.
 */
export function ensureText(value: unknown, fallback?: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback?.trim() ?? "";
}
