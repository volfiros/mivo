import { NextResponse } from "next/server";
import { createRouteErrorResponse } from "@/lib/api-error";
import { createGenerationJob } from "@/lib/records";
import { generationRequestSchema } from "@/lib/schema/content";

export async function POST(request: Request) {
  try {
    const body = generationRequestSchema.parse(await request.json());
    const jobId = await createGenerationJob({
      documentId: body.documentId,
      mode: "create",
      requestPayload: body
    });
    return NextResponse.json({ jobId });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to create generation job");
  }
}
