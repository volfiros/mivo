import { requireUser } from "@/lib/auth-helpers";
import { NewDocumentForm } from "@/components/studio/new-document-form";

export default async function NewDocumentPage() {
  const user = await requireUser("/studio/new");
  return <NewDocumentForm user={user} />;
}
