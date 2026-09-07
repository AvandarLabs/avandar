import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox, NumberInput, Select, Text, TextInput } from "@mantine/core";
import { match } from "ts-pattern";
import { DataSourceMetadata } from "./DatasetImportForm.types";
import { PdfParseControls } from "./PdfParseControls/PdfParseControls";
import type { FileParseOptions } from "./useSaveDataset/useSaveDataset";

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
      const tabOptions = datasetLoadResult.availableTabs.map((tab) => {
        return { value: String(tab.sheetId), label: tab.title };
      });
      const hasSingleTab = tabOptions.length === 1;

      // No header control, and no rows-to-skip control. A tab arrives as CSV,
      // and DuckDB's CSV sniffer decides the header itself.
      return (
        <Tooltip
          label={t`There is only one tab in this spreadsheet.`}
          disabled={!hasSingleTab}
        >
          <Select
            label={t`Tab`}
            data={tabOptions}
            value={String(parseOptions.sheetId ?? datasetLoadResult.sheetId)}
            disabled={hasSingleTab}
            onChange={(value) => {
              const tab = datasetLoadResult.availableTabs.find((candidate) => {
                return String(candidate.sheetId) === value;
              });
              if (!tab) {
                return;
              }
              // Both are recorded: the gid is what the export URL addresses,
              // and the title is what a saved dataset shows a human.
              return onDataSourceMetadataChange({
                ...googleSheetsProps,
                parseOptions: {
                  ...parseOptions,
                  sheetId: tab.sheetId,
                  sheetName: tab.title,
                },
              });
            }}
          />
        </Tooltip>
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
