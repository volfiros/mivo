const DEFAULT_APP_PATH = "/studio";

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
