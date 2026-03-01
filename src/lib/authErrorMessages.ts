export function friendlySignInError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();

  if (lower.includes("not confirmed")) {
    return "Your email is not confirmed yet. Check your inbox or contact support.";
  }

  // Keep login failures non-enumerable: do not reveal whether an email exists.
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "We couldn't sign you in with those details. If you're new, create an account. Otherwise, reset your password and try again.";
  }

  return msg || "Sign in failed. Please try again.";
}

