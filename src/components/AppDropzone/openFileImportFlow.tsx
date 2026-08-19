import { Trans } from "@lingui/react/macro";
import { modals } from "@mantine/modals";
import { MODAL_ABOVE_NUX_TOUR_Z_INDEX } from "@/config/Theme";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import { ImportConfirmBody } from "./ImportConfirmBody";

/**
 * Starts the app-wide "import a file" flow.
 *
 * Shows a confirmation dialog, then a large modal with `ManualUploadView`
 * pre-loaded with the dropped file. Saving the import closes the modal;
 * canceling leaves the user on the current page.
 */
export function openFileImportFlow(file: File): void {
  // Wait a microtask so the full-screen drop overlay (z-index 9999) can
  // finish closing. Opening in the same turn as `onDrop` can leave the
  // modal content at opacity 0.
  queueMicrotask(() => {
    modals.openConfirmModal({
      title: <Trans>Import this file?</Trans>,
      labels: {
        confirm: <Trans>Import</Trans>,
        cancel: <Trans>Cancel</Trans>,
      },
      centered: true,
      zIndex: MODAL_ABOVE_NUX_TOUR_Z_INDEX,
      children: <ImportConfirmBody fileName={file.name} />,
      onConfirm: () => {
        // Open on a macrotask so the confirm click cannot land on the
        // import form (Upload / Process data again) that mounts in the
        // same turn.
        window.setTimeout(() => {
          const importModalId = modals.open({
            title: <Trans>Import data</Trans>,
            size: "90%",
            styles: {
              content: { height: "90%" },
              body: { height: "calc(100% - var(--mantine-spacing-md))" },
            },
            children: (
              <ManualUploadView
                initialFile={file}
                onAfterSave={() => {
                  modals.close(importModalId);
                }}
              />
            ),
          });
        }, 0);
      },
    });
  });
}
