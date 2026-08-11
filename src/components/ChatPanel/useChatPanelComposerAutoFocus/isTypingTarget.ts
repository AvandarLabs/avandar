/**
 * Whether keyboard focus is on a field that owns keystrokes for its own UX
 * (typing, blur, clearing, closing a dropdown), and so should not be stolen.
 */
export function isTypingTarget(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  if (
    element.isContentEditable ||
    element.contentEditable === "true" ||
    element.contentEditable === "plaintext-only"
  ) {
    return true;
  }

  return false;
}
