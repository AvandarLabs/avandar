import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { DatasetParseControls } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseControls";
import css from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseOptionsBar/DatasetParseOptionsBar.module.css";
import type {
  DatasetImportFormProps,
  DataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { ReactNode } from "react";

type Props = {
  dataSourceMetadata: DataSourceMetadata;
  onDataSourceMetadataChange: DatasetImportFormProps["onDataSourceMetadataChange"];
  onRequestDataReparse: DatasetImportFormProps["onRequestDataReparse"];
  isProcessing: boolean;
};

/**
 * How the file was read, and the control that reads it again.
 *
 * The settings stay on screen rather than behind a disclosure: adjusting
 * them is the whole job of the review step, and a re-parse remounts this
 * form, which would close any disclosure the user had just opened.
 *
 * It sits on the tinted body surface so it reads as the controls belonging
 * to the preview below it, without becoming another bordered card.
 */
export function DatasetParseOptionsBar({
  dataSourceMetadata,
  onDataSourceMetadataChange,
  onRequestDataReparse,
  isProcessing,
}: Readonly<Props>): ReactNode {
  return (
    <Group gap="sm" align="flex-end" className={css.bar}>
      <DatasetParseControls
        onDataSourceMetadataChange={onDataSourceMetadataChange}
        onRequestDataReparse={onRequestDataReparse}
        {...dataSourceMetadata}
      />
      <Button
        type="button"
        variant="default"
        size="compact-sm"
        className={css.reparseButton}
        onClick={() => {
          return onRequestDataReparse(dataSourceMetadata.parseOptions);
        }}
        loading={isProcessing}
        disabled={isProcessing}
      >
        <Trans>Process data again</Trans>
      </Button>
    </Group>
  );
}
