import Papa from "papaparse";
import { match } from "ts-pattern";
import { MIMEType, RawCellValue, RawDataRow } from "@/lib/types/common";

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
        return Papa.unparse(data, { delimiter: ",", newline: "\n" });
      },
    )
    .otherwise(() => {
      throw new Error("Unsupported dataset type for local storage.");
    });
  return result;
}
