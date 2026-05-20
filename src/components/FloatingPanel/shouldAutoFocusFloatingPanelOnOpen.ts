import { isFloatingPanelTypingTarget } from "./isFloatingPanelTypingTarget";

/**
 * Whether opening a floating panel should move focus onto the panel chrome.
 * Skips when the user is already typing in an input outside the panel.
 */
export function shouldAutoFocusFloatingPanelOnOpen(
  panel: HTMLElement,
): boolean {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) {
    return true;
  }

  if (panel.contains(activeElement)) {
    return false;
  }

  return !isFloatingPanelTypingTarget(activeElement);
}
