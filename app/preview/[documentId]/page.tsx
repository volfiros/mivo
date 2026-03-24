import { notFound } from "next/navigation";
import { DocumentPreview } from "@/components/editor/document-preview";
import { getDocument } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = await getDocument(documentId);

  if (!document) {
    notFound();
  }

  return <DocumentPreview content={document.currentContentJson} documentId={document.id} />;
}
