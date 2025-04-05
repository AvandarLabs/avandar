import Papa from "papaparse";
import { useCallback, useState } from "react";
import { FileMetadata } from "@/models/LocalDataset";
import { CSVRow, MIMEType } from "@/types/common";

/**
 * Custom hook for handling CSV file parsing.
 * @param options Optional configuration options.
 * @param options.onNoFileProvided Optional callback function to be called
 * when File is undefined.
 * @returns An object containing the parsed CSV data and a function to parse a
 * file.
 */
export function useCSV({
  delimiter = ",",
  firstRowIsHeader = true,
  onNoFileProvided,
}: {
  delimiter?: string;
  firstRowIsHeader?: boolean;
  onNoFileProvided?: () => void;
} = {}): {
  csv: Papa.ParseResult<CSVRow> | undefined;
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

  const parseFileOrString = useCallback(
    (dataToParse: File | string) => {
      Papa.parse<CSVRow>(dataToParse, {
        // TODO(pablo): `header` should be toggleable eventually.
        header: firstRowIsHeader,
        delimiter: delimiter,
        complete: (results: Papa.ParseResult<CSVRow>) => {
          const { meta, data, errors } = results;
          setCSV({
            data,
            meta,
            errors,
          });

          if (typeof dataToParse !== "string") {
            setFileMetadata({
              name: dataToParse.name,
              mimeType: dataToParse.type as MIMEType,
              sizeInBytes: dataToParse.size,
            });
          }
        },
      });
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

  return { csv, fileMetadata, parseFile, parseCSVString };
}
