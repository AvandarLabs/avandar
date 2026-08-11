import { isTypingTarget } from "./isTypingTarget";

/**
 * Whether opening a panel should move focus onto the panel chrome. Skips when
 * the user is already typing in a field outside the panel.
 */
export function shouldAutoFocusPanelOnOpen(panel: HTMLElement): boolean {
  const activeElement = document.activeElement;
  return (
    !(activeElement instanceof HTMLElement) ||
    (!panel.contains(activeElement) && !isTypingTarget(activeElement))
  );
}
