import { modals } from "@mantine/modals";
import { useEffect } from "react";

/**
 * Keeps a plugin modal open while its work runs, by turning off the modal's
 * Escape key and close button, so the outcome of that work is never lost to
 * a closed modal. Does nothing without a modal id.
 */
export function useKeepModalOpenWhile(
  isRunning: boolean,
  modalId: string | undefined,
): void {
  useEffect(() => {
    if (modalId !== undefined) {
      modals.updateModal({
        modalId,
        closeOnEscape: !isRunning,
        withCloseButton: !isRunning,
      });
    }
  }, [isRunning, modalId]);
}
