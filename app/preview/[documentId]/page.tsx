import { requireOwnedDocument, requireUser } from "@/lib/auth-helpers";
import { DocumentPreview } from "@/components/editor/document-preview";
import { getDocumentVersionContent } from "@/lib/records";
import type { JSONContent } from "@tiptap/core";
import { contentTypeSchema } from "@/lib/schema/content";
import { sanitizeDocumentContent } from "@/lib/schema/editor";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { documentId } = await params;
  const { version } = await searchParams;
  const user = await requireUser(`/preview/${documentId}`);
  const document = await requireOwnedDocument(user.id, documentId);
  const contentType = contentTypeSchema.parse(document.contentType);
  let content: JSONContent = sanitizeDocumentContent(
    document.currentContentJson,
    contentType,
  );
  let versionLabel: string | null = null;

  if (version) {
    const requestedVersion = await getDocumentVersionContent({
      userId: user.id,
      documentId,
      versionId: version
    });

    content = sanitizeDocumentContent(requestedVersion.content, contentType);
    versionLabel = `v${requestedVersion.versionNumber}`;
  }

  return (
    <DocumentPreview
      content={content}
      contentType={contentType}
      documentId={document.id}
      title={document.title}
      versionLabel={versionLabel}
    />
  );
}
