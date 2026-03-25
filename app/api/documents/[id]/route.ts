import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteErrorResponse } from "@/lib/api-error";
import { requireRequestUser } from "@/lib/auth-helpers";
import {
  deleteOwnedDocument,
  getLatestUserDocument,
  getOwnedDocument,
  saveDocumentContent,
} from "@/lib/records";

const patchSchema = z.object({
  title: z.string().min(1),
  content: z.any()
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authState = await requireRequestUser(request);

  if (authState.response) {
    return authState.response;
  }

  const { id } = await params;
  const document = await getOwnedDocument(authState.user.id, id);

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const versionId = await saveDocumentContent({
      userId: authState.user.id,
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const { id } = await params;
    await deleteOwnedDocument(authState.user.id, id);
    const nextDocument = await getLatestUserDocument(authState.user.id);

    return NextResponse.json({
      ok: true,
      nextPath: nextDocument ? `/studio/${nextDocument.id}` : "/studio/new"
    });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to delete document");
  }
}
