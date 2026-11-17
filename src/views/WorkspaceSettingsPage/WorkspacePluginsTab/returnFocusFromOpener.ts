/**
 * Puts focus back where the admin was before a plugin modal opened. The
 * button that opened it may be gone by now, for example when an install or
 * an uninstall changes the card's buttons. Then focus goes to the card's
 * heading, which every card button points to with `aria-describedby`.
 */
export function returnFocusFromOpener(
  opener: Element | null,
  headingId: string | null,
): void {
  const target =
    opener?.isConnected === true
      ? opener
      : headingId === null
        ? null
        : document.getElementById(headingId);
  if (target instanceof HTMLElement) {
    target.focus({ preventScroll: true });
  }
}
