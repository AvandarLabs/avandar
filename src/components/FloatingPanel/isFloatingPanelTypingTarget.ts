/**
 * Whether keyboard focus is on a field that should keep Escape for its own UX
 * (blur, clear, close dropdown, etc.) instead of dismissing the floating panel.
 */
export function isFloatingPanelTypingTarget(element: Element | null): boolean {
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
