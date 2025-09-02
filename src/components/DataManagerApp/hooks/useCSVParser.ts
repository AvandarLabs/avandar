import Papa from "papaparse";
import { useCallback, useState } from "react";
import { MIMEType, RawDataRow } from "@/lib/types/common";
import { propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import {
  detectColumnDataTypes,
  DetectedDatasetColumn,
} from "./detectColumnDataTypes";

type FileMetadata = {
  name: string;
  mimeType: MIMEType;
  sizeInBytes: number;
};

// TODO(jpsyx): move this to lib/utils
export function parseFileOrStringToCSV({
  dataToParse,
  firstRowIsHeader,
  delimiter,
}: {
  dataToParse: File | string;
  firstRowIsHeader: boolean;
  delimiter: string;
}): Promise<{
  fileMetadata?: FileMetadata;
  columns: DetectedDatasetColumn[];
  csv: Papa.ParseResult<RawDataRow>;
}> {
  return new Promise((resolve, reject) => {
    console.log("📦 dataToParse is a", typeof dataToParse, dataToParse);
    Papa.parse<RawDataRow>(dataToParse, {
      // TODO(jpsyx): `header` should be toggleable eventually.
      header: firstRowIsHeader,
      delimiter,
      complete: (results: Papa.ParseResult<RawDataRow>) => {
        const { meta, data, errors } = results;
        const csv = {
          data,
          meta,
          errors,
        };

        console.log("🔍 meta.fields raw:", meta.fields);
        console.log("🔍 typeof meta.fields:", typeof meta.fields);
        console.log(
          "🔍 meta.fields instanceof Array:",
          meta.fields instanceof Array,
        );
        console.log("🔍 meta.fields[0]:", meta.fields?.[0]);

        if (firstRowIsHeader && Array.isArray(meta.fields)) {
          const cleanedFields = meta.fields
            .filter((f): f is string => {
              return typeof f === "string" && f.trim() !== "" && !/^_/.test(f);
            })
            .map((f) => {
              return f.trim();
            });

          console.log("✅ Cleaned CSV Headers:", cleanedFields);

          csv.data = csv.data.map((row) => {
            const newRow: Record<string, unknown> = {};
            for (const field of cleanedFields) {
              newRow[field] = row[field];
            }
            return newRow as RawDataRow;
          });
        }

        if (!meta.fields || meta.fields.length === 0) {
          console.error(
            "CSV parse failed — no headers detected:",
            data.slice(0, 2),
          );
          reject(new Error("CSV parsing failed — headers not detected."));
          return;
        }
        const fields = detectColumnDataTypes(meta.fields, data);

        // check if there are any fields we've determined are dates
        const dateFields = fields.filter(propEquals("dataType", "date"));
        if (dateFields.length > 0) {
          // mutate the CSV data - standardize the dates into ISO format
          csv.data.forEach((row) => {
            dateFields.forEach((field) => {
              const dateString = row[field.name];
              if (dateString) {
                row[field.name] = new Date(
                  Date.parse(dateString),
                ).toISOString();
              }
            });
          });
        }

        const fileMetadata =
          typeof dataToParse !== "string" ?
            {
              name: dataToParse.name,
              mimeType: dataToParse.type as MIMEType,
              sizeInBytes: dataToParse.size,
            }
          : undefined;

        console.log("👀 CSV Meta Fields:", meta.fields);
        console.log("👀 First row of data:", data[0]);

        resolve({
          csv,
          columns: fields,
          fileMetadata,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

/**
 * Custom hook for handling CSV file parsing.
 * @param options Optional configuration options.
 * @param options.onNoFileProvided Optional callback function to be called
 * when File is undefined.
 * @returns An object containing the parsed CSV data and a function to parse a
 * file.
 */
export function useCSVParser({
  delimiter = ",",
  firstRowIsHeader = true,
  onNoFileProvided,
}: {
  delimiter?: string;
  firstRowIsHeader?: boolean;
  onNoFileProvided?: () => void;
} = {}): {
  csv: Papa.ParseResult<RawDataRow> | undefined;
  columns: readonly DetectedDatasetColumn[];
  fileMetadata: FileMetadata | undefined;
  parseFile: (file: File | undefined) => void;
  parseCSVString: (csvString: string) => void;
} {
  const [csv, setCSV] = useState<Papa.ParseResult<RawDataRow> | undefined>(
    undefined,
  );
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | undefined>(
    undefined,
  );
  const [columns, setColumns] = useState<readonly DetectedDatasetColumn[]>([]);

  const parseFileOrString = useCallback(
    async (dataToParse: File | string) => {
      const result = await parseFileOrStringToCSV({
        dataToParse,
        firstRowIsHeader,
        delimiter,
      });

      setCSV(result.csv);
      setFileMetadata(result.fileMetadata);
      setColumns(result.columns);
    },
    [delimiter, firstRowIsHeader],
  );

  const parseFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        onNoFileProvided?.();
        return;
      }

      parseFileOrString(file);
    },
    [parseFileOrString, onNoFileProvided],
  );

  const parseCSVString = useCallback(
    (csvString: string) => {
      parseFileOrString(csvString);
    },
    [parseFileOrString],
  );

  return { csv, columns: columns, fileMetadata, parseFile, parseCSVString };
}
