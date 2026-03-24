import { NextResponse } from "next/server";
import { createRouteErrorResponse } from "@/lib/api-error";
import { requireRequestUser } from "@/lib/auth-helpers";
import { createGenerationJob } from "@/lib/records";
import { generationRequestSchema } from "@/lib/schema/content";

export async function POST(request: Request) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const body = generationRequestSchema.parse(await request.json());
    const jobId = await createGenerationJob({
      userId: authState.user.id,
      documentId: body.documentId,
      mode: "create",
      requestPayload: body
    });
    return NextResponse.json({ jobId });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to create generation job");
  }
}
