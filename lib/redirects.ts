const DEFAULT_APP_PATH = "/studio";
const DEFAULT_SETUP_REDIRECT_PATH = "/studio/new";

export function getSafeRedirectPath(value: string | null | undefined, fallback = DEFAULT_APP_PATH) {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function createSignInHref(nextPath = DEFAULT_APP_PATH) {
  const next = getSafeRedirectPath(nextPath, DEFAULT_APP_PATH);
  return `/auth/sign-in?next=${encodeURIComponent(next)}`;
}

export function createOpenAiSetupHref(nextPath = DEFAULT_SETUP_REDIRECT_PATH) {
  const next = getSafeRedirectPath(nextPath, DEFAULT_SETUP_REDIRECT_PATH);
  const safeNext = next.startsWith("/setup/openai")
    ? DEFAULT_SETUP_REDIRECT_PATH
    : next;
  return `/setup/openai?next=${encodeURIComponent(safeNext)}`;
}
