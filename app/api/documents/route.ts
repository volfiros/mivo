import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteErrorResponse } from "@/lib/api-error";
import { createDocument } from "@/lib/records";

const requestSchema = z.object({
  contentType: z.enum(["social_post", "blog_post", "landing_page"]),
  title: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const document = await createDocument(body);

    if (!document) {
      return NextResponse.json({ error: "Document was created but could not be loaded" }, { status: 500 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to create document");
  }
}
