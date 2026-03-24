import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteErrorResponse } from "@/lib/api-error";
import { getDocument, saveDocumentContent } from "@/lib/records";

const patchSchema = z.object({
  title: z.string().min(1),
  content: z.any()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const versionId = await saveDocumentContent({
      documentId: id,
      content: body.content,
      title: body.title,
      changeSource: "user_edit"
    });
    return NextResponse.json({ versionId });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to save document");
  }
}
