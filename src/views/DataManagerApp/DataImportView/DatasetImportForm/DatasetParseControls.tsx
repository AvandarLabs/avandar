import type { FileParseOptions } from "./useSaveDataset/useSaveDataset";

import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox, NumberInput, Select, Text, TextInput } from "@mantine/core";
import { match } from "ts-pattern";

import { DataSourceMetadata } from "./DatasetImportForm.types";
import { PdfParseControls } from "./PdfParseControls/PdfParseControls";

type Props = {
  onDataSourceMetadataChange: (options: DataSourceMetadata) => void;
  /**
   * Only a PDF needs this: its parse options are chosen on the rendered
   * page, so the controls have to be able to render it.
   */
  sourceFile?: File;
  /**
   * A PDF re-extracts as soon as a region changes, rather than waiting for
   * the "Process data again" button the other sources use.
   */
  onRequestDataReparse: (parseOptions: FileParseOptions) => void;
} & DataSourceMetadata;

export function DatasetParseControls({
  onDataSourceMetadataChange,
  sourceFile,
  onRequestDataReparse,
  ...dataSourceMetadata
}: Props): JSX.Element {
  const { t } = useLingui();
  return match(dataSourceMetadata)
    .with({ sourceType: "csv_file" }, (csvProps) => {
      const { parseOptions } = csvProps;
      return (
        <>
          <NumberInput
            label={t`Number of rows to skip`}
            value={parseOptions.numRowsToSkip ?? 0}
            onChange={(value) => {
              return onDataSourceMetadataChange({
                ...csvProps,
                parseOptions: {
                  ...parseOptions,
                  numRowsToSkip: Number(value),
                },
              });
            }}
          />
          <TextInput
            label={t`Delimiter`}
            value={parseOptions.delimiter ?? ","}
            onChange={(e) => {
              return onDataSourceMetadataChange({
                ...csvProps,
                parseOptions: {
                  ...parseOptions,
                  delimiter: e.currentTarget.value,
                },
              });
            }}
          />
        </>
      );
    })
    .with({ sourceType: "xlsx_file" }, (xlsxProps) => {
      const { parseOptions, datasetLoadResult: datasetLoadMetadata } =
        xlsxProps;
      const sheetOptions = datasetLoadMetadata.availableSheetNames.map(
        (sheetName) => {
          return {
            value: sheetName,
            label: sheetName,
          };
        },
      );
      const hasSingleSheet = sheetOptions.length === 1;

      return (
        <>
          <Tooltip
            label={t`There is only one sheet in this excel sheet.`}
            disabled={!hasSingleSheet}
          >
            <Select
              label={t`Sheet name`}
              data={sheetOptions}
              value={parseOptions.sheetName ?? null}
              disabled={hasSingleSheet}
              onChange={(value) => {
                return onDataSourceMetadataChange({
                  ...xlsxProps,
                  parseOptions: {
                    ...parseOptions,
                    sheetName: value ?? undefined,
                  },
                });
              }}
            />
          </Tooltip>
          <NumberInput
            label={t`Number of rows to skip`}
            value={parseOptions.numRowsToSkip ?? 0}
            onChange={(value) => {
              return onDataSourceMetadataChange({
                ...xlsxProps,
                parseOptions: {
                  ...parseOptions,
                  numRowsToSkip: Number(value),
                },
              });
            }}
          />
          <Checkbox
            label={t`The sheet has a header row`}
            checked={parseOptions.hasHeader ?? true}
            onChange={(event) => {
              return onDataSourceMetadataChange({
                ...xlsxProps,
                parseOptions: {
                  ...parseOptions,
                  hasHeader: event.currentTarget.checked,
                },
              });
            }}
          />
          <TextInput
            label={t`Date format`}
            value={parseOptions.dateFormat ?? ""}
            placeholder="%Y-%m-%d"
            onChange={(event) => {
              return onDataSourceMetadataChange({
                ...xlsxProps,
                parseOptions: {
                  ...parseOptions,
                  dateFormat: event.currentTarget.value || null,
                },
              });
            }}
          />
          <TextInput
            label={t`Timestamp format`}
            value={parseOptions.timestampFormat ?? ""}
            placeholder="%Y-%m-%d %H:%M:%S"
            onChange={(event) => {
              return onDataSourceMetadataChange({
                ...xlsxProps,
                parseOptions: {
                  ...parseOptions,
                  timestampFormat: event.currentTarget.value || null,
                },
              });
            }}
          />
        </>
      );
    })
    .with({ sourceType: "pdf_file" }, (pdfProps) => {
      // What a PDF import is parameterised by is chosen on the page itself,
      // which needs the file. Without it there is nothing to draw on.
      return sourceFile ? (
        <PdfParseControls
          sourceFile={sourceFile}
          metadata={pdfProps}
          onDataSourceMetadataChange={onDataSourceMetadataChange}
          onRequestDataReparse={onRequestDataReparse}
        />
      ) : (
        <></>
      );
    })
    .with({ sourceType: "google_sheets" }, (googleSheetsProps) => {
      const { parseOptions, datasetLoadResult } = googleSheetsProps;
      const sheetOptions = datasetLoadResult.availableSheetNames.map(
        (sheetName) => {
          return { value: sheetName, label: sheetName };
        },
      );
      const hasSingleSheet = sheetOptions.length === 1;

      // No rows-to-skip control here, unlike the CSV and XLSX branches. Sheets
      // reads through `read_xlsx`, which cannot express a row skip without the
      // sheet's exact used range, and a Google Sheets user can delete preamble
      // rows in the sheet itself.
      return (
        <>
          <Tooltip
            label={t`There is only one tab in this spreadsheet.`}
            disabled={!hasSingleSheet}
          >
            <Select
              label={t`Tab`}
              data={sheetOptions}
              value={
                parseOptions.sheetName ??
                datasetLoadResult.sheetLoadMetadata.sheet ??
                null
              }
              disabled={hasSingleSheet}
              onChange={(value) => {
                return onDataSourceMetadataChange({
                  ...googleSheetsProps,
                  parseOptions: {
                    ...parseOptions,
                    sheetName: value ?? undefined,
                  },
                });
              }}
            />
          </Tooltip>
          <Checkbox
            label={t`The tab has a header row`}
            checked={parseOptions.hasHeader ?? true}
            onChange={(event) => {
              return onDataSourceMetadataChange({
                ...googleSheetsProps,
                parseOptions: {
                  ...parseOptions,
                  hasHeader: event.currentTarget.checked,
                },
              });
            }}
          />
        </>
      );
    })
    .exhaustive(() => {
      return (
        <Text>
          <Trans>Unsupported file type</Trans>
        </Text>
      );
    });
}
