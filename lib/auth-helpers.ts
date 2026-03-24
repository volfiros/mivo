import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { AuthenticatedUserSummary } from "@/lib/auth-types";
import { createSignInHref, getSafeRedirectPath } from "@/lib/redirects";
import {
  getGenerationJobForUser,
  getLatestUserDocument,
  getOwnedDocument,
  type OwnedDocumentRecord,
  type UserDocumentSummary
} from "@/lib/records";

function toAuthenticatedUserSummary(user: Record<string, unknown>): AuthenticatedUserSummary {
  const username =
    typeof user.displayUsername === "string" && user.displayUsername
      ? user.displayUsername
      : typeof user.username === "string" && user.username
        ? user.username
        : typeof user.name === "string" && user.name
          ? user.name
          : typeof user.email === "string"
            ? user.email
            : "Account";

  return {
    id: String(user.id),
    email: typeof user.email === "string" ? user.email : "",
    username,
    displayName: typeof user.name === "string" && user.name ? user.name : username
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
  return session?.user ? toAuthenticatedUserSummary(session.user as Record<string, unknown>) : null;
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
    user: toAuthenticatedUserSummary(session.user as Record<string, unknown>)
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

  if (nextPath) {
    return nextPath;
  }

  const latestDocument = await getLatestUserDocument(userId);
  return latestDocument ? `/studio/${latestDocument.id}` : "/studio/new";
}

export function createLaunchHref(user: AuthenticatedUserSummary | null) {
  return user ? "/studio" : createSignInHref("/studio");
}

export type { UserDocumentSummary };
