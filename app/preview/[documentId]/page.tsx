import { requireOwnedDocument, requireUser } from "@/lib/auth-helpers";
import { DocumentPreview } from "@/components/editor/document-preview";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requireUser(`/preview/${documentId}`);
  const document = await requireOwnedDocument(user.id, documentId);

  return <DocumentPreview content={document.currentContentJson} documentId={document.id} />;
}
