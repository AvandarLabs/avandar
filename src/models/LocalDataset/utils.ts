import { MIMEType, RawCellValue, RawDataRow } from "$/lib/types/common";
import { isNonEmptyArray } from "$/lib/utils/guards/isNonEmptyArray/isNonEmptyArray";
import Papa from "papaparse";
import { match } from "ts-pattern";

/**
 * Convert a dataset back into a raw string. Only CSVs are supported for now.
 * @param options
 * @returns
 */
export function unparseDataset(
  options:
    | {
        datasetType: MIMEType.TEXT_CSV;
        data: RawDataRow[];
      }
    | {
        datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET;
        data: RawCellValue[][];
      }
    | {
        datasetType: Exclude<
          MIMEType,
          MIMEType.TEXT_CSV | MIMEType.APPLICATION_GOOGLE_SPREADSHEET
        >;
        data: unknown;
      },
): string {
  const result = match(options)
    .with({ datasetType: MIMEType.TEXT_CSV }, ({ data }) => {
      return Papa.unparse(data, {
        header: true,
        delimiter: ",",
        newline: "\n",
      });
    })
    .with(
      { datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET },
      ({ data }) => {
        if (isNonEmptyArray(data)) {
          const numColumns = data[0].length;

          // now we pad all rows to make sure any columns with missing values
          // are padded with empty strings
          const paddedData = data.map((row) => {
            if (row.length < numColumns) {
              row.push(...Array(numColumns - row.length).fill(""));
              return row;
            }
            return row;
          });

          return Papa.unparse(paddedData, { delimiter: ",", newline: "\n" });
        }
        return "";
      },
    )
    .otherwise(() => {
      throw new Error("Unsupported dataset type for local storage.");
    });
  return result;
}
