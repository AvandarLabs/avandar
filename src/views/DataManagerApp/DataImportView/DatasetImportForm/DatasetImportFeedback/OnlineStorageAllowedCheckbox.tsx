import { Callout } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Checkbox, Text } from "@mantine/core";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
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
 */
export function OnlineStorageAllowedCheckbox({
  dataSourceMetadata,
  offlineOnlyTitle,
  onChange,
}: Readonly<Props>): ReactNode {
  if (!DatasetSource.canBeOfflineOnly(dataSourceMetadata)) {
    return undefined;
  }
  return (
    <Checkbox
      label={
        <>
          <Text span>
            <Trans>This dataset can be stored in the cloud. </Trans>
          </Text>
          {!dataSourceMetadata.onlineStorageAllowed ?
            <Callout mt="sm" title={offlineOnlyTitle} titleSize="xl">
              <Text c="red.8">
                <Trans>
                  This dataset will no longer be stored online and can only be
                  accessed as long as it is on your personal computer. Nobody on
                  your team will be able to access this data. This is
                  recommended only for very sensitive data.
                </Trans>
              </Text>
            </Callout>
          : null}
        </>
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
