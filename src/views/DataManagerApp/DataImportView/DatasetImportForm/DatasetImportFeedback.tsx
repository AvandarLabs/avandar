import { Callout } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Button, Checkbox, Group, Stack, Text } from "@mantine/core";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import classes from "./DatasetImportForm.module.css";
import { DatasetParseControls } from "./DatasetParseControls";
import type {
  DatasetImportFormProps,
  DataSourceMetadata,
} from "./DatasetImportForm.types";
import type { DatasetImportCopy } from "./useDatasetImportCopy";
import type {
  DatasetImportValidation,
  FormErrorSummaryItem,
} from "./useDatasetImportValidation";
import type { useImportedColumns } from "./useImportedColumns/useImportedColumns";
import type { UnknownObject } from "@avandar/utils";
import type { ReactNode } from "react";

export type DatasetImportFeedbackProps = {
  columns: ReturnType<typeof useImportedColumns>;
  copy: DatasetImportCopy;
  dataSourceMetadata: DataSourceMetadata;
  isProcessing: boolean;
  onDataSourceMetadataChange: DatasetImportFormProps["onDataSourceMetadataChange"];
  onRequestDataReparse: DatasetImportFormProps["onRequestDataReparse"];
  previewRows: UnknownObject[];
  validation: DatasetImportValidation;
};

/** Whether the parse produced anything at all, said in the matching colour. */
function _renderImportStatus(
  options: Readonly<{
    failureMessage: string;
    failureTitle: string;
    numRows: number;
    successMessage: string;
    successTitle: string;
  }>,
): ReactNode {
  return options.numRows === 0 ?
      <Callout
        title={options.failureTitle}
        color="error"
        message={options.failureMessage}
      />
    : <Callout
        title={options.successTitle}
        color="success"
        message={options.successMessage}
      />;
}

/** The sampled rows and columns, with the controls to parse them again. */
function _renderDatasetPreview(
  options: Readonly<{
    columns: DatasetImportFeedbackProps["columns"];
    columnsMessage: string;
    dataSourceMetadata: DataSourceMetadata;
    isProcessing: boolean;
    onDataSourceMetadataChange: DatasetImportFeedbackProps["onDataSourceMetadataChange"];
    onRequestDataReparse: DatasetImportFeedbackProps["onRequestDataReparse"];
    previewMessage: string;
    previewRows: UnknownObject[];
  }>,
): ReactNode {
  return (
    <DatasetPreviewBlock
      previewRows={options.previewRows}
      columns={options.columns}
      dataPreviewCalloutMessage={options.previewMessage}
      dataColumnsCalloutMessage={options.columnsMessage}
      dataPreviewCalloutContents={
        <Group align="flex-end">
          <DatasetParseControls
            onDataSourceMetadataChange={options.onDataSourceMetadataChange}
            {...options.dataSourceMetadata}
          />
          <Button
            onClick={() => {
              return options.onRequestDataReparse(
                options.dataSourceMetadata.parseOptions,
              );
            }}
            loading={options.isProcessing}
            disabled={options.isProcessing}
          >
            <Trans>Process data again</Trans>
          </Button>
        </Group>
      }
    />
  );
}

/**
 * The cloud-storage toggle, for the source types that can be kept offline-only.
 * Every other source has nowhere else to live, so the control is omitted.
 */
function _renderOnlineStorageAllowed(
  options: Readonly<{
    dataSourceMetadata: DataSourceMetadata;
    offlineOnlyTitle: string;
    onChange: DatasetImportFeedbackProps["onDataSourceMetadataChange"];
  }>,
): ReactNode {
  const dataSourceMetadata = options.dataSourceMetadata;
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
            <Callout mt="sm" title={options.offlineOnlyTitle} titleSize="xl">
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
        options.onChange({
          ...dataSourceMetadata,
          onlineStorageAllowed: event.currentTarget.checked,
        });
      }}
    />
  );
}

/** Every outstanding validation error, under the field that holds it. */
function _renderErrorSummary(
  options: Readonly<{
    isVisible: boolean;
    items: readonly FormErrorSummaryItem[];
    message: string;
    title: string;
  }>,
): ReactNode {
  if (!options.isVisible || options.items.length === 0) {
    return undefined;
  }
  return (
    <Callout color="error" title={options.title} message={options.message}>
      <Stack
        component="ul"
        className={classes.datasetImportFormErrorList}
        gap="xs"
        mt="xs"
      >
        {options.items.map((item) => {
          return (
            <Text component="li" key={item.field} size="sm" c="red.8">
              {item.line}
            </Text>
          );
        })}
      </Stack>
    </Callout>
  );
}

/**
 * Everything the form says back about the data it just parsed: whether the
 * parse worked, what it produced, where it may be stored, and what still needs
 * fixing before it can be saved.
 */
export function DatasetImportFeedback({
  columns,
  copy,
  dataSourceMetadata,
  isProcessing,
  onDataSourceMetadataChange,
  onRequestDataReparse,
  previewRows,
  validation,
}: Readonly<DatasetImportFeedbackProps>): ReactNode {
  return (
    <>
      {_renderImportStatus({
        numRows: dataSourceMetadata.datasetLoadResult.numRows,
        failureMessage: copy.failureMessage,
        failureTitle: copy.failureTitle,
        successMessage: copy.successMessage,
        successTitle: copy.successTitle,
      })}
      {_renderDatasetPreview({
        columns,
        columnsMessage: copy.columnsMessage,
        dataSourceMetadata,
        isProcessing,
        onDataSourceMetadataChange,
        onRequestDataReparse,
        previewMessage: copy.previewMessage,
        previewRows,
      })}
      {_renderOnlineStorageAllowed({
        dataSourceMetadata,
        offlineOnlyTitle: copy.offlineOnlyTitle,
        onChange: onDataSourceMetadataChange,
      })}
      {_renderErrorSummary({
        isVisible: validation.isFormErrorSummaryVisible,
        items: validation.formErrorSummaryItems,
        title: copy.errorTitle,
        message: copy.errorMessage,
      })}
    </>
  );
}
