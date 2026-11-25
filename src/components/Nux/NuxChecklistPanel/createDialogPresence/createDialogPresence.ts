/** Whether a kind of overlay dialog is open, and a way to watch for changes. */
export type DialogPresence = {
  isOpen: () => boolean;
  /**
   * Calls `onChange` once right away and again each time the overlay opens
   * or closes. Returns the unsubscribe function.
   */
  subscribe: (onChange: () => void) => () => void;
};

/**
 * Builds a presence tracker for Mantine overlays whose root matches
 * `rootSelector`.
 *
 * Mantine keeps an overlay's root in the document while `opened` is false,
 * so the tracker looks for the `role="dialog"` element that appears only
 * once the overlay opens. Mantine portals the root onto `document.body`,
 * often nested in a shared portal node, so the tracker watches the body's
 * whole subtree.
 */
export function createDialogPresence(rootSelector: string): DialogPresence {
  const dialogSelector = `${rootSelector} [role="dialog"]`;
  const isOpen = (): boolean => {
    return document.querySelector(dialogSelector) !== null;
  };
  const subscribe = (onChange: () => void): (() => void) => {
    let wasOpen = isOpen();
    onChange();
    const observer = new MutationObserver(() => {
      const isOpenNow = isOpen();
      if (isOpenNow === wasOpen) {
        return;
      }
      wasOpen = isOpenNow;
      onChange();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  };
  return { isOpen, subscribe };
}
