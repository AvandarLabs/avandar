import { Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import type { useLingui } from "@lingui/react/macro";

/**
 * Starts the app-wide "import a file" flow.
 *
 * Shows a confirmation dialog asking the user if they want to import
 * the file. If they confirm, opens a large modal containing the
 * `ManualUploadView` pre-loaded with the dropped file so the user can
 * proceed through the dataset import flow without leaving the current
 * page. When the import is saved, the modal closes itself; on cancel,
 * the user is left exactly where they were.
 */
export function openFileImportFlow(
  file: File,
  t: ReturnType<typeof useLingui>["t"],
): void {
  modals.openConfirmModal({
    title: t`Import this file?`,
    labels: { confirm: t`Import`, cancel: t`Cancel` },
    centered: true,
    children: (
      <Stack mt="md">
        <Text>
          {t`Do you want to import "${file.name}" as a new dataset?`}
        </Text>
      </Stack>
    ),
    onConfirm: () => {
      const importModalId = modals.open({
        title: t`Import data`,
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
}
