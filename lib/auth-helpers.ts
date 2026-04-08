import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { AuthenticatedUserSummary } from "@/lib/auth-types";
import {
  createOpenAiSetupHref,
  createSignInHref,
  getSafeRedirectPath,
} from "@/lib/redirects";
import { getUserOpenAiApiKey, getUserOpenAiKeySummary } from "@/lib/openai-key";
import {
  getGenerationJobForUser,
  getLatestUserDocument,
  getOwnedDocument,
  type OwnedDocumentRecord,
  type UserDocumentSummary
} from "@/lib/records";

function deriveUsername(user: Record<string, unknown>) {
  if (typeof user.displayUsername === "string" && user.displayUsername) {
    return user.displayUsername;
  }

  if (typeof user.username === "string" && user.username) {
    return user.username;
  }

  if (typeof user.name === "string" && user.name) {
    return user.name;
  }

  if (typeof user.email === "string" && user.email) {
    return user.email;
  }

  return "Account";
}

async function toAuthenticatedUserSummary(user: Record<string, unknown>): Promise<AuthenticatedUserSummary> {
  const userId = String(user.id);
  const username = deriveUsername(user);
  const keySummary = await getUserOpenAiKeySummary(userId);

  return {
    id: userId,
    email: typeof user.email === "string" ? user.email : "",
    username,
    displayName: typeof user.name === "string" && user.name ? user.name : username,
    hasOpenAiKey: keySummary.hasOpenAiKey,
    maskedOpenAiKey: keySummary.maskedOpenAiKey,
  };
}

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers()
  });
}

export async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers
  });
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user
    ? toAuthenticatedUserSummary(session.user as Record<string, unknown>)
    : null;
}

export async function requireUser(nextPath = "/studio") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(createSignInHref(nextPath) as Route);
  }

  return user;
}

export async function requireRequestUser(request: Request) {
  const session = await getRequestSession(request);

  if (!session?.user) {
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      user: null
    };
  }

  return {
    response: null,
    user: await toAuthenticatedUserSummary(session.user as Record<string, unknown>)
  };
}

export async function requireOwnedDocument(userId: string, documentId: string): Promise<OwnedDocumentRecord> {
  const document = await getOwnedDocument(userId, documentId);

  if (!document) {
    notFound();
  }

  return document;
}

export async function getOwnedDocumentOrNotFound(userId: string, documentId: string) {
  const document = await getOwnedDocument(userId, documentId);
  return document ?? null;
}

export async function getOwnedJobOrNotFound(userId: string, jobId: string) {
  const job = await getGenerationJobForUser(userId, jobId);
  return job ?? null;
}

export async function getPostLoginRedirectPath(userId: string, requestedNext?: string | null) {
  const nextPath = getSafeRedirectPath(requestedNext, "");
  const keySummary = await getUserOpenAiKeySummary(userId);

  if (!keySummary.hasOpenAiKey) {
    return createOpenAiSetupHref(nextPath || "/studio/new");
  }

  if (nextPath) {
    return nextPath;
  }

  const latestDocument = await getLatestUserDocument(userId);
  return latestDocument ? `/studio/${latestDocument.id}` : "/studio/new";
}

export function createLaunchHref(user: AuthenticatedUserSummary | null) {
  return user ? "/studio/new" : createSignInHref("/studio/new");
}

export async function requireRequestUserOpenAiKey(request: Request) {
  const authState = await requireRequestUser(request);

  if (authState.response) {
    return {
      response: authState.response,
      user: null,
      apiKey: null,
    };
  }

  const apiKey = await getUserOpenAiApiKey(authState.user.id);

  if (!apiKey) {
    return {
      response: NextResponse.json(
        { error: "Add your OpenAI key to continue." },
        { status: 400 },
      ),
      user: authState.user,
      apiKey: null,
    };
  }

  return {
    response: null,
    user: authState.user,
    apiKey,
  };
}

export type { UserDocumentSummary };
