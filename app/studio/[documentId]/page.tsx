import { requireOwnedDocument, requireUser } from "@/lib/auth-helpers";
import { Workspace } from "@/components/studio/workspace";
import { listUserDocuments } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function StudioDocumentPage({
  params
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requireUser(`/studio/${documentId}`);
  const [document, draftHistory] = await Promise.all([
    requireOwnedDocument(user.id, documentId),
    listUserDocuments(user.id)
  ]);

  return <Workspace document={document} draftHistory={draftHistory} user={user} />;
}
