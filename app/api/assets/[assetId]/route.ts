import { NextResponse } from "next/server";
import { getStoredAsset } from "@/lib/asset-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const asset = await getStoredAsset(assetId);

  if (!asset || asset.kind !== "generated_image") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return new Response(asset.buffer, {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${asset.filename ?? `${asset.id}.bin`}"`,
    },
  });
}
