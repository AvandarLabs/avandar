import { createDialogPresence } from "@/components/Nux/NuxChecklistPanel/createDialogPresence/createDialogPresence";
import { PRODUCT_MODAL_ROOT_SELECTOR } from "@/config/Theme";

/**
 * Presence of a Mantine product modal dialog.
 *
 * Modal.Root stays in the document while `opened` is false (ModalsProvider,
 * the welcome modal, the completion modal). The dialog is what appears only
 * after open. Joyride's overlay is not a product modal.
 */
export const ProductModalPresence = createDialogPresence(
  PRODUCT_MODAL_ROOT_SELECTOR,
);
