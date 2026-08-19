import { Trans } from "@lingui/react/macro";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { DatasetParseControls } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseControls";
import { isPdfAwaitingSelection } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/isPdfAwaitingSelection";
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
  sourceFile?: File;
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
  sourceFile,
}: Readonly<Props>): ReactNode {
  // A freshly-uploaded PDF has geometry but no rows, and will keep having
  // none until the user marks a region. Showing the usual (empty) grid here
  // would read as "your file was empty", so ask for the missing input
  // instead.
  if (isPdfAwaitingSelection(dataSourceMetadata)) {
    return (
      <Stack w="100%">
        <Alert
          variant="light"
          color="blue"
          title={<Trans>No region selected yet</Trans>}
        >
          <Text size="sm">
            <Trans>
              Select a region on the page to see data. Draw a box around a
              table, chart or block of text, or highlight a sentence.
            </Trans>
          </Text>
        </Alert>
        {/*
          The picker has to be reachable in exactly this state: it is the only
          way to make the state end. The "Process data again" button stays
          out, because a region change re-extracts on its own.
        */}
        <DatasetParseControls
          onDataSourceMetadataChange={onDataSourceMetadataChange}
          onRequestDataReparse={onRequestDataReparse}
          sourceFile={sourceFile}
          {...dataSourceMetadata}
        />
      </Stack>
    );
  }

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
            onRequestDataReparse={onRequestDataReparse}
            sourceFile={sourceFile}
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
