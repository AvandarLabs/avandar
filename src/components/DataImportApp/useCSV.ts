import { notifications } from "@mantine/notifications";
import Papa from "papaparse";
import { useState } from "react";
import { CSVData, CSVRow, MIMEType } from "@/types/helpers";

type CSVMetadata = {
  fileMeta: {
    name: string;
    mimeType: MIMEType;
    sizeInBytes: number;
  };
  csvMeta: Papa.ParseMeta;
  data: CSVData;
  errors: Papa.ParseError[];
};

/**
 * Custom hook for handling CSV file parsing.
 * @param options Optional configuration options.
 * @param options.onNoFileSelected Optional callback function to be called
 * when no file is selected.
 * @returns An object containing the parsed CSV data and a function to parse a file.
 */
export function useCSV(options?: { onNoFileSelected?: () => void }): {
  csv: CSVMetadata | undefined;
  parseFile: (file: File | undefined) => void;
} {
  const [csv, setCSV] = useState<CSVMetadata | undefined>(undefined);

  const parseFile = (file: File | undefined) => {
    if (!file) {
      options?.onNoFileSelected?.();
      return;
    }

    Papa.parse<CSVRow>(file, {
      header: true,
      complete: (results: Papa.ParseResult<CSVRow>) => {
        const { meta, data, errors } = results;
        setCSV({
          data,
          errors,
          fileMeta: {
            name: file.name,
            mimeType: file.type as MIMEType,
            sizeInBytes: file.size,
          },
          csvMeta: meta,
        });
      },
    });
  };

  return { csv, parseFile };
}
