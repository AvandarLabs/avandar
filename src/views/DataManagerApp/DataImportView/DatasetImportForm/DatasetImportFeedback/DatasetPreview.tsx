import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection";
import { DatasetParseControls } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseControls";
import { DatasetParseOptionsBar } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseOptionsBar/DatasetParseOptionsBar";
import { isPdfAwaitingSelection } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/isPdfAwaitingSelection";
import type { DatasetImportFeedbackProps } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetImportFeedback";
import type { DataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { UnknownObject } from "@avandar/utils";
import type { ReactNode } from "react";

type Props = {
  columns: DatasetImportFeedbackProps["columns"];
  columnsMeta: string;
  dataSourceMetadata: DataSourceMetadata;
  isProcessing: boolean;
  onDataSourceMetadataChange: DatasetImportFeedbackProps["onDataSourceMetadataChange"];
  onRequestDataReparse: DatasetImportFeedbackProps["onRequestDataReparse"];
  previewMeta: string;
  previewRows: UnknownObject[];
  sourceFile?: File;
};

/** The sampled rows and columns, with the controls to parse them again. */
export function DatasetPreview({
  columns,
  columnsMeta,
  dataSourceMetadata,
  isProcessing,
  onDataSourceMetadataChange,
  onRequestDataReparse,
  previewMeta,
  previewRows,
  sourceFile,
}: Readonly<Props>): ReactNode {
  const isPdfSource = dataSourceMetadata.sourceType === "pdf_file";

  // A freshly-uploaded PDF has geometry but no rows, and will keep having
  // none until the user marks a region. Showing the usual (empty) grid here
  // would read as "your file was empty", so ask for the missing input
  // instead.
  if (isPdfAwaitingSelection(dataSourceMetadata)) {
    return (
      <AppViewSection title={<Trans>Choose what to read</Trans>}>
        <Stack gap="md">
          <Text size="sm" c="dimmed" maw="65ch">
            <Trans>
              Draw a box around a table, chart, or block of text on the page,
              or highlight a sentence. Avandar reads only what you mark.
            </Trans>
          </Text>
          {/*
            The picker has to be reachable in exactly this state: it is the
            only way to make the state end. The "Process data again" button
            stays out, because a region change re-extracts on its own.
          */}
          <DatasetParseControls
            onDataSourceMetadataChange={onDataSourceMetadataChange}
            onRequestDataReparse={onRequestDataReparse}
            sourceFile={sourceFile}
            {...dataSourceMetadata}
          />
        </Stack>
      </AppViewSection>
    );
  }

  return (
    <Stack gap="xl">
      {/*
        A PDF is parameterised by regions drawn on the rendered page, so its
        controls need a section of their own rather than a strip above the
        grid. Every other source type fits on one line.
      */}
      {isPdfSource ? (
        <AppViewSection title={<Trans>What to read</Trans>}>
          <DatasetParseControls
            onDataSourceMetadataChange={onDataSourceMetadataChange}
            onRequestDataReparse={onRequestDataReparse}
            sourceFile={sourceFile}
            {...dataSourceMetadata}
          />
        </AppViewSection>
      ) : null}

      <DatasetPreviewBlock
        previewRows={previewRows}
        columns={columns}
        previewMeta={previewMeta}
        columnsMeta={columnsMeta}
        previewControls={
          isPdfSource ? null : (
            <DatasetParseOptionsBar
              dataSourceMetadata={dataSourceMetadata}
              isProcessing={isProcessing}
              onDataSourceMetadataChange={onDataSourceMetadataChange}
              onRequestDataReparse={onRequestDataReparse}
            />
          )
        }
      />
    </Stack>
  );
}
