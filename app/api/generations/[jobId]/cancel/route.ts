import { NextResponse } from "next/server";
import { setJobStatus } from "@/lib/records";

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  await setJobStatus(jobId, "cancelled");
  return NextResponse.json({ ok: true });
}
