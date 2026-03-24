import { createLaunchHref, getCurrentUser } from "@/lib/auth-helpers";
import { Landing } from "@/components/landing";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <Landing user={user} launchHref={createLaunchHref(user)} />;
}
