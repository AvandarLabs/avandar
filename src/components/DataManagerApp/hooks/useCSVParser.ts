import Papa from "papaparse";
import { useCallback, useState } from "react";
import { CSVRow, MIMEType } from "@/lib/types/common";
import { FileMetadata } from "@/models/LocalDataset/types";
import { detectFieldDataTypes } from "./detectFieldDataTypes";
import type { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";

// TODO(jpbls): move this to lib/utils
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
  fields: LocalDatasetField[];
  csv: Papa.ParseResult<CSVRow>;
}> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(dataToParse, {
      // TODO(jpbls): `header` should be toggleable eventually.
      header: firstRowIsHeader,
      delimiter,
      complete: (results: Papa.ParseResult<CSVRow>) => {
        const { meta, data, errors } = results;
        const csv = {
          data,
          meta,
          errors,
        };
        const fields = detectFieldDataTypes(meta.fields ?? [], data);
        const fileMetadata =
          typeof dataToParse !== "string" ?
            {
              name: dataToParse.name,
              mimeType: dataToParse.type as MIMEType,
              sizeInBytes: dataToParse.size,
            }
          : undefined;

        resolve({
          csv,
          fields,
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
  csv: Papa.ParseResult<CSVRow> | undefined;
  fields: readonly LocalDatasetField[];
  fileMetadata: FileMetadata | undefined;
  parseFile: (file: File | undefined) => void;
  parseCSVString: (csvString: string) => void;
} {
  const [csv, setCSV] = useState<Papa.ParseResult<CSVRow> | undefined>(
    undefined,
  );
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | undefined>(
    undefined,
  );
  const [fields, setFields] = useState<readonly LocalDatasetField[]>([]);

  const parseFileOrString = useCallback(
    async (dataToParse: File | string) => {
      const result = await parseFileOrStringToCSV({
        dataToParse,
        firstRowIsHeader,
        delimiter,
      });

      setCSV(result.csv);
      setFileMetadata(result.fileMetadata);
      setFields(result.fields);
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

  return { csv, fields, fileMetadata, parseFile, parseCSVString };
}
