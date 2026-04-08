import { NextResponse } from "next/server";
import { createRouteErrorResponse } from "@/lib/api-error";
import { requireRequestUser } from "@/lib/auth-helpers";
import { getUserOpenAiApiKey } from "@/lib/openai-key";

export async function POST(request: Request) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const apiKey = await getUserOpenAiApiKey(authState.user.id);

    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI key is stored for this account." },
        { status: 404 },
      );
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to reveal OpenAI key");
  }
}
