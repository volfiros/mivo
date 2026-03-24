import { notFound } from "next/navigation";
import { Workspace } from "@/components/studio/workspace";
import { getDocument } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function StudioDocumentPage({
  params
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = await getDocument(documentId);

  if (!document) {
    notFound();
  }

  return <Workspace document={document} />;
}
