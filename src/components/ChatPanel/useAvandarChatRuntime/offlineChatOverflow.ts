/**
 * Detects a WebLLM prompt that exceeded the engine context window.
 */
export function isOfflineContextWindowOverflow(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "ContextWindowSizeExceededError") {
    return true;
  }
  return /context window/i.test(error.message);
}

/**
 * Assistant text for a caught context-window overflow, or undefined when the
 * error should still propagate.
 */
export function offlineChatOverflowAssistantText(
  error: unknown,
  contextWindowExceeded: string,
): string | undefined {
  if (!isOfflineContextWindowOverflow(error)) {
    return undefined;
  }
  return contextWindowExceeded;
}
