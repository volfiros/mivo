import { NextResponse } from "next/server";
import { z } from "zod";
import { createDocument } from "@/lib/records";

const requestSchema = z.object({
  contentType: z.enum(["social_post", "blog_post", "landing_page"]),
  title: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const document = await createDocument(body);
    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create document" },
      { status: 400 }
    );
  }
}
