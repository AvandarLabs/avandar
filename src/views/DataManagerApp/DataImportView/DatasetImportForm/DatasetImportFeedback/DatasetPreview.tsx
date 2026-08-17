import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { DatasetParseControls } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseControls";
import type { DatasetImportFeedbackProps } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetImportFeedback";
import type { DataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { UnknownObject } from "@avandar/utils";
import type { ReactNode } from "react";

type Props = {
  columns: DatasetImportFeedbackProps["columns"];
  columnsMessage: string;
  dataSourceMetadata: DataSourceMetadata;
  isProcessing: boolean;
  onDataSourceMetadataChange: DatasetImportFeedbackProps["onDataSourceMetadataChange"];
  onRequestDataReparse: DatasetImportFeedbackProps["onRequestDataReparse"];
  previewMessage: string;
  previewRows: UnknownObject[];
};

/** The sampled rows and columns, with the controls to parse them again. */
export function DatasetPreview({
  columns,
  columnsMessage,
  dataSourceMetadata,
  isProcessing,
  onDataSourceMetadataChange,
  onRequestDataReparse,
  previewMessage,
  previewRows,
}: Readonly<Props>): ReactNode {
  return (
    <DatasetPreviewBlock
      previewRows={previewRows}
      columns={columns}
      dataPreviewCalloutMessage={previewMessage}
      dataColumnsCalloutMessage={columnsMessage}
      dataPreviewCalloutContents={
        <Group align="flex-end">
          <DatasetParseControls
            onDataSourceMetadataChange={onDataSourceMetadataChange}
            {...dataSourceMetadata}
          />
          <Button
            onClick={() => {
              return onRequestDataReparse(dataSourceMetadata.parseOptions);
            }}
            loading={isProcessing}
            disabled={isProcessing}
          >
            <Trans>Process data again</Trans>
          </Button>
        </Group>
      }
    />
  );
}
