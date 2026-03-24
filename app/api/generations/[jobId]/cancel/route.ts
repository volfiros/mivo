import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth-helpers";
import { getGenerationJobForUser, setJobStatus } from "@/lib/records";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const authState = await requireRequestUser(request);

  if (authState.response) {
    return authState.response;
  }

  const { jobId } = await params;
  const job = await getGenerationJobForUser(authState.user.id, jobId);

  if (!job) {
    return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
  }

  await setJobStatus(jobId, "cancelled");
  return NextResponse.json({ ok: true });
}
