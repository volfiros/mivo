import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteErrorResponse } from '@/lib/api-error';
import { requireRequestUser } from '@/lib/auth-helpers';
import { saveDocumentTitle } from '@/lib/records';

const patchTitleSchema = z.object({
  title: z.string().min(1),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authState = await requireRequestUser(request);

    if (authState.response) {
      return authState.response;
    }

    const { id } = await params;
    const body = patchTitleSchema.parse(await request.json());
    
    await saveDocumentTitle({
      userId: authState.user.id,
      documentId: id,
      title: body.title,
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createRouteErrorResponse(error, 'Unable to save document title');
  }
}