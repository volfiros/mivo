import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { createRouteErrorResponse } from "@/lib/api-error";

const handler = toNextJsHandler(auth);

export async function GET(...args: Parameters<typeof handler.GET>) {
  try {
    return await handler.GET(...args);
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to complete auth request.");
  }
}

export async function POST(...args: Parameters<typeof handler.POST>) {
  try {
    return await handler.POST(...args);
  } catch (error) {
    return createRouteErrorResponse(error, "Unable to complete auth request.");
  }
}
