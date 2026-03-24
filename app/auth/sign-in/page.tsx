import type { Route } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser, getPostLoginRedirectPath } from "@/lib/auth-helpers";
import { getSafeRedirectPath } from "@/lib/redirects";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const currentUser = await getCurrentUser();

  if (currentUser) {
    const destination = await getPostLoginRedirectPath(currentUser.id, next);
    redirect(destination as Route);
  }

  return <AuthForm mode="sign-in" nextPath={getSafeRedirectPath(next, "/studio")} />;
}
