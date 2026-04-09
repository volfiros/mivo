import type { Route } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { NewDocumentForm } from "@/components/studio/new-document-form";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage() {
  const user = await requireUser("/studio/new");

  if (!user.hasOpenAiKey) {
    redirect("/setup/openai?next=%2Fstudio%2Fnew" as Route);
  }

  return <NewDocumentForm user={user} />;
}
