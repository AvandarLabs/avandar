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

/**
 * Puts focus on a plugin card's heading once the plugin is uninstalled,
 * because the Uninstall button that opened the dialog is gone or about to
 * go. When the card is gone too, such as that of a plugin no longer bundled,
 * focus goes back to the opener if it is still on the page, and otherwise
 * stays where the browser left it.
 */
export function returnFocusToCardHeading(
  opener: Element | null,
  headingId: string | null,
): void {
  const heading =
    headingId === null ? null : document.getElementById(headingId);
  if (heading instanceof HTMLElement) {
    heading.focus({ preventScroll: true });
    return;
  }
  returnFocusFromOpener(opener, null);
}
