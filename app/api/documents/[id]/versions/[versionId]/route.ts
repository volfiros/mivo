import { NextResponse } from "next/server";
import { createRouteErrorResponse } from "@/lib/api-error";
import { requireRequestUser } from "@/lib/auth-helpers";
import { getDocumentVersionContent } from "@/lib/records";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const { id, versionId } = await params;
    const version = await getDocumentVersionContent({
      userId: authState.user.id,
      documentId: id,
      versionId
    });

    return NextResponse.json({ version });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to load document version");
  }
}
