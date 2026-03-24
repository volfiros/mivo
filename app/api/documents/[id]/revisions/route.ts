import { NextResponse } from "next/server";
import { rewriteRequestSchema } from "@/lib/schema/content";
import { getDocument } from "@/lib/records";
import { rewriteSelection } from "@/lib/ai/generation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = rewriteRequestSchema.parse(await request.json());
    const document = await getDocument(id);

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to rewrite selection" },
      { status: 400 }
    );
  }
}
