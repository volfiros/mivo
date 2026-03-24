import { NextResponse } from "next/server";
import { createRouteErrorResponse } from "@/lib/api-error";
import { requireRequestUser } from "@/lib/auth-helpers";
import { rewriteRequestSchema } from "@/lib/schema/content";
import { getOwnedDocument } from "@/lib/records";
import { rewriteSelection } from "@/lib/ai/generation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const { id } = await params;
    const body = rewriteRequestSchema.parse(await request.json());
    const document = await getOwnedDocument(authState.user.id, id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const replacement = await rewriteSelection({
      selectionText: body.selectionText,
      instruction: body.instruction,
      documentTitle: document.title
    });

    return NextResponse.json({ replacement });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to rewrite selection");
  }
}
