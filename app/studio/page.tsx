import type { Route } from "next";
import { redirect } from "next/navigation";
import { getPostLoginRedirectPath, requireUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function StudioIndexPage() {
  const user = await requireUser("/studio");
  const destination = await getPostLoginRedirectPath(user.id);
  redirect(destination as Route);
}
