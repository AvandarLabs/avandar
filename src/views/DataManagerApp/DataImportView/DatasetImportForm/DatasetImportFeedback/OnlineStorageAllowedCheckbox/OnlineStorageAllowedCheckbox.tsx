import { Trans } from "@lingui/react/macro";
import { Checkbox, Text } from "@mantine/core";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import css from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/OnlineStorageAllowedCheckbox/OnlineStorageAllowedCheckbox.module.css";
import type { DatasetImportFeedbackProps } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetImportFeedback";
import type { DataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { ReactNode } from "react";

type Props = {
  dataSourceMetadata: DataSourceMetadata;
  offlineOnlyTitle: string;
  onChange: DatasetImportFeedbackProps["onDataSourceMetadataChange"];
};

/**
 * The cloud-storage toggle, for the source types that can be kept offline-only.
 * Every other source has nowhere else to live, so the control is omitted.
 *
 * Unchecking it is consequential, so the consequence is stated in the
 * control's own description rather than in a callout nested inside its
 * label. A checkbox that grows a bordered panel when you clear it moves the
 * save button down the page at the moment the user is reaching for it.
 */
export function OnlineStorageAllowedCheckbox({
  dataSourceMetadata,
  offlineOnlyTitle,
  onChange,
}: Readonly<Props>): ReactNode {
  if (!DatasetSource.canBeOfflineOnly(dataSourceMetadata)) {
    return undefined;
  }

  const isOfflineOnly = !dataSourceMetadata.onlineStorageAllowed;

  return (
    <Checkbox
      className={css.onlineStorageAllowedCheckbox}
      label={<Trans>This dataset can be stored in the cloud.</Trans>}
      description={
        isOfflineOnly ? (
          <Text component="span" size="xs" c="danger.8">
            <Trans>
              {offlineOnlyTitle}: it will live only on this computer, and nobody
              else on your team will be able to open it.
            </Trans>
          </Text>
        ) : undefined
      }
      checked={dataSourceMetadata.onlineStorageAllowed}
      onChange={(event) => {
        onChange({
          ...dataSourceMetadata,
          onlineStorageAllowed: event.currentTarget.checked,
        });
      }}
    />
  );
}
