import { Trans } from "@lingui/react/macro";
import { modals } from "@mantine/modals";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import { ImportConfirmBody } from "./ImportConfirmBody";

/**
 * Starts the app-wide "import a file" flow.
 *
 * Shows a confirmation dialog asking the user if they want to import
 * the file. If they confirm, opens a large modal containing the
 * `ManualUploadView` pre-loaded with the dropped file so the user can
 * proceed through the dataset import flow without leaving the current
 * page. When the import is saved, the modal closes itself; on cancel,
 * the user is left exactly where they were.
 *
 * Opens on the next microtask so the full-screen drop overlay (z-index
 * 9999) can finish closing before the confirm modal mounts. Opening in
 * the same turn as `onDrop` left the modal content at opacity 0.
 */
export function openFileImportFlow(file: File): void {
  queueMicrotask(() => {
    modals.openConfirmModal({
      title: <Trans>Import this file?</Trans>,
      labels: {
        confirm: <Trans>Import</Trans>,
        cancel: <Trans>Cancel</Trans>,
      },
      centered: true,
      children: <ImportConfirmBody fileName={file.name} />,
      onConfirm: () => {
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
      },
    });
  });
}
