import Papa from "papaparse";
import { useCallback, useState } from "react";
import { MIMEType, RawCellValue, RawDataRow } from "@/lib/types/common";
import {
  detectColumnDataTypes,
  DetectedDatasetColumn,
} from "./detectColumnDataTypes";

type FileMetadata = {
  name: string;
  mimeType: MIMEType;
  sizeInBytes: number;
};

function normalizeFieldName(s: string): string {
  return s
    .replace(/\u00A0/g, " ") // non-breaking space
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\s+/g, "_") // whitespace to underscore
    .replace(/[^\w]/g, "") // remove non-word
    .trim();
}

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
    const rawTextPromise =
      typeof dataToParse === "string" ?
        Promise.resolve(dataToParse)
      : dataToParse.text();

    rawTextPromise.then((rawText) => {
      const cleanedText = rawText.replace(
        /([$€£]?)([\d,]+(?:\.\d{2})?)/g,
        (_, symbol, number) => {
          // Only clean if it's a known currency symbol + number
          if (!symbol) return `${number}`;
          return number.replace(/,/g, "");
        },
      );
      Papa.parse<RawDataRow>(cleanedText, {
        header: firstRowIsHeader,
        delimiter,
        skipEmptyLines: true,
        complete: (results) => {
          const { meta, data, errors } = results;
          if (!meta.fields || meta.fields.length === 0) {
            return reject(
              new Error("CSV parsing failed — headers not detected."),
            );
          }

          const cleanedFields = meta.fields.map((f, i) => {
            const cleaned = normalizeFieldName(f);
            return cleaned || `column_${i}`;
          });
          const fieldMap = Object.fromEntries(
            meta.fields.map((f, i) => {
              return [f, cleanedFields[i]];
            }),
          );

          const cleanedRows = data.map((row) => {
            const newRow: RawDataRow = {};
            for (const rawKey in row) {
              const cleanedKey = fieldMap[rawKey];
              if (typeof cleanedKey === "string") {
                newRow[cleanedKey] = row[rawKey] as RawCellValue;
              }
            }
            return newRow;
          });
          const detected = detectColumnDataTypes(cleanedFields, cleanedRows);

          resolve({
            fileMetadata:
              typeof dataToParse !== "string" ?
                {
                  name: dataToParse.name,
                  mimeType: dataToParse.type as MIMEType,
                  sizeInBytes: dataToParse.size,
                }
              : undefined,
            columns: detected,
            csv: {
              data: cleanedRows,
              meta: {
                ...meta,
                fields: cleanedFields,
              },
              errors,
            },
          });
        },
        error: reject,
      });
    });
  });
}

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
  columns: DetectedDatasetColumn[];
  fileMetadata: FileMetadata | undefined;
  parseFile: (file: File | undefined) => void;
  parseCSVString: (str: string) => void;
} {
  const [csv, setCSV] = useState<Papa.ParseResult<RawDataRow>>();
  const [columns, setColumns] = useState<DetectedDatasetColumn[]>([]);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata>();

  const parseFileOrString = useCallback(
    async (input: File | string) => {
      const result = await parseFileOrStringToCSV({
        dataToParse: input,
        firstRowIsHeader,
        delimiter,
      });
      setCSV(result.csv);
      setColumns(result.columns);
      setFileMetadata(result.fileMetadata);
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
    (str: string) => {
      parseFileOrString(str);
    },
    [parseFileOrString],
  );

  return { csv, columns, fileMetadata, parseFile, parseCSVString };
}
