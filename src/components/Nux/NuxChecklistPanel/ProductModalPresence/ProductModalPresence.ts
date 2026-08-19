import { PRODUCT_MODAL_ROOT_SELECTOR } from "@/config/Theme";

const PRODUCT_MODAL_DIALOG_SELECTOR = `${PRODUCT_MODAL_ROOT_SELECTOR} [role="dialog"]`;

function _isProductModalOpen(): boolean {
  return document.querySelector(PRODUCT_MODAL_DIALOG_SELECTOR) !== null;
}

function _subscribeToProductModalPresence(onChange: () => void): () => void {
  let wasOpen = _isProductModalOpen();
  onChange();
  const observer = new MutationObserver(() => {
    const isOpen = _isProductModalOpen();
    if (isOpen === wasOpen) {
      return;
    }
    wasOpen = isOpen;
    onChange();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
  };
}

/**
 * Presence of a Mantine product modal dialog.
 *
 * Modal.Root stays in the document while `opened` is false (ModalsProvider,
 * the welcome modal, the completion modal). The dialog is what appears only
 * after open. Mantine portals Modal.Root onto `document.body`, often nested
 * in a portal node, so subscribe watches the body's subtree. Joyride's
 * overlay is not a product modal.
 */
export const ProductModalPresence = {
  isOpen: _isProductModalOpen,
  subscribe: _subscribeToProductModalPresence,
};
