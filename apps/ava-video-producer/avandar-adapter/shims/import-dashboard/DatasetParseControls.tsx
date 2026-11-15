import { NumberInput, TextInput } from "@mantine/core";
import type { DatasetParseControls as ProductDatasetParseControls } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseControls";
import type { ComponentProps } from "react";

type Props = Extract<
  ComponentProps<typeof ProductDatasetParseControls>,
  { sourceType: "csv_file" }
>;

/**
 * Deterministic CSV-only dependency seam for DatasetParseOptionsBar.
 * The visible CSV branch is copied from the product's DatasetParseControls.
 * Other source parsers are deliberately unreachable in this CSV film.
 */
export function DatasetParseControls({
  onDataSourceMetadataChange,
  ...csvProps
}: Props) {
  const { parseOptions } = csvProps;
  if (csvProps.sourceType !== "csv_file")
    throw new Error("The import film only demonstrates CSV.");
  return (
    <>
      <NumberInput
        label="Number of rows to skip"
        value={parseOptions.numRowsToSkip ?? 0}
        onChange={(value) =>
          onDataSourceMetadataChange({
            ...csvProps,
            parseOptions: { ...parseOptions, numRowsToSkip: Number(value) },
          })
        }
      />
      <TextInput
        label="Delimiter"
        value={parseOptions.delimiter ?? ","}
        onChange={(event) =>
          onDataSourceMetadataChange({
            ...csvProps,
            parseOptions: {
              ...parseOptions,
              delimiter: event.currentTarget.value,
            },
          })
        }
      />
    </>
  );
}
