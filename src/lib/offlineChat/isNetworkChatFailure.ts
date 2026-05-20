/**
 * True when a chat POST likely failed due to connectivity, not auth/validation.
 */
export function isNetworkChatFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("networkerror") ||
    error.name === "TypeError"
  );
}
