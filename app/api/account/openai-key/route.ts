import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteErrorResponse } from "@/lib/api-error";
import { requireRequestUser } from "@/lib/auth-helpers";
import {
  deleteUserOpenAiApiKey,
  getUserOpenAiKeySummary,
  saveUserOpenAiApiKey,
  validateOpenAiApiKey,
} from "@/lib/openai-key";

const requestSchema = z.object({
  apiKey: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const summary = await getUserOpenAiKeySummary(authState.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to load OpenAI key metadata");
  }
}

export async function PUT(request: Request) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const body = requestSchema.parse(await request.json());
    await validateOpenAiApiKey(body.apiKey);
    const summary = await saveUserOpenAiApiKey(authState.user.id, body.apiKey);
    return NextResponse.json(summary);
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to save OpenAI key");
  }
}

export async function DELETE(request: Request) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const summary = await deleteUserOpenAiApiKey(authState.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to remove OpenAI key");
  }
}
