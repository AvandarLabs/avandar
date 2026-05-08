import { Checkbox, NumberInput, Select, Text, TextInput } from "@mantine/core";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { match } from "ts-pattern";
import { DataSourceMetadata } from "./DatasetImportForm";

type Props = {
  onDataSourceMetadataChange: (options: DataSourceMetadata) => void;
} & DataSourceMetadata;

export function DatasetParseControls({
  onDataSourceMetadataChange,
  ...dataSourceMetadata
}: Props): JSX.Element {
  return match(dataSourceMetadata)
    .with({ sourceType: "csv_file" }, (csvProps) => {
      const { parseOptions } = csvProps;
      return (
        <>
          <NumberInput
            label="Number of rows to skip"
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
            label="Delimiter"
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
            label="There is only one sheet in this excel sheet."
            disabled={!hasSingleSheet}
          >
            <Select
              label="Sheet name"
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
            label="Number of rows to skip"
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
            label="The sheet has a header row"
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
            label="Date format"
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
            label="Timestamp format"
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
    .with({ sourceType: "google_sheets" }, (googleSheetsProps) => {
      const { parseOptions } = googleSheetsProps;
      return (
        <NumberInput
          label="Number of rows to skip"
          value={parseOptions.numRowsToSkip ?? 0}
          onChange={(value) => {
            return onDataSourceMetadataChange({
              ...googleSheetsProps,
              parseOptions: {
                ...parseOptions,
                numRowsToSkip: Number(value),
              },
            });
          }}
        />
      );
    })
    .exhaustive(() => {
      return <Text>Unsupported file type</Text>;
    });
}
