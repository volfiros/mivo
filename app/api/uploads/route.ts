import { NextResponse } from "next/server";
import { createRouteErrorResponse } from "@/lib/api-error";
import { requireRequestUser } from "@/lib/auth-helpers";
import { chunkText, saveUpload } from "@/lib/storage";
import { createAttachmentRecord } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authState = await requireRequestUser(request);

  if (authState.response) {
    return authState.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const documentId = formData.get("documentId");

  if (!(file instanceof File) || typeof documentId !== "string") {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  try {
    const saved = await saveUpload(file);
    const chunks = chunkText(saved.extractedText);
    const attachmentId = await createAttachmentRecord({
      userId: authState.user.id,
      documentId,
      filename: file.name,
      mimeType: saved.mimeType,
      storagePath: saved.storagePath,
      extractedText: saved.extractedText,
      chunks
    });

    return NextResponse.json({ attachmentId });
  } catch (error) {
    return createRouteErrorResponse(error, "Upload failed");
  }
}
