import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack } from "@mantine/core";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { ErrorSummary } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/ErrorSummary";
import { OnlineStorageAllowedCheckbox } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/OnlineStorageAllowedCheckbox";
import css from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportActions/DatasetImportActions.module.css";
import type {
  DatasetImportFormProps,
  DataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { DatasetImportCopy } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportCopy";
import type { DatasetImportValidation } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportValidation";
import type { ReactNode } from "react";

export type DatasetImportActionsProps = {
  copy: DatasetImportCopy;
  dataSourceMetadata: DataSourceMetadata;
  disableSubmit: boolean | undefined;
  /** Saving writes to storage, so it is unavailable with no connection. */
  isOfflineBlocked: boolean;
  isSavePending: boolean;
  onDataSourceMetadataChange: DatasetImportFormProps["onDataSourceMetadataChange"];
  validation: DatasetImportValidation;
};

/**
 * The bar that closes the import: where the dataset will live, anything
 * still blocking the save, and the save itself.
 *
 * It sticks to the bottom of the scrolling review so the primary action is
 * reachable from any scroll position. Reviewing a wide dataset used to mean
 * scrolling two screens back down to find the button.
 */
export function DatasetImportActions({
  copy,
  dataSourceMetadata,
  disableSubmit,
  isOfflineBlocked,
  isSavePending,
  onDataSourceMetadataChange,
  validation,
}: Readonly<DatasetImportActionsProps>): ReactNode {
  return (
    <div className={css.bar}>
      <Stack gap="sm">
        <ErrorSummary
          isVisible={validation.isFormErrorSummaryVisible}
          items={validation.formErrorSummaryItems}
          title={copy.errorTitle}
          message={copy.errorMessage}
        />
        <Group gap="md" justify="space-between" align="center" wrap="wrap">
          <OnlineStorageAllowedCheckbox
            dataSourceMetadata={dataSourceMetadata}
            offlineOnlyTitle={copy.offlineOnlyTitle}
            onChange={onDataSourceMetadataChange}
          />
          <OfflineGated>
            <Button
              className={css.saveButton}
              loading={isSavePending}
              type="submit"
              disabled={disableSubmit}
              data-disabled={disableSubmit || isOfflineBlocked || undefined}
              aria-disabled={disableSubmit || isOfflineBlocked}
            >
              <Trans>Save Dataset</Trans>
            </Button>
          </OfflineGated>
        </Group>
      </Stack>
    </div>
  );
}
