import { notifications } from "@mantine/notifications";
import Papa from "papaparse";
import { useState } from "react";
import { MIMEType } from "@/types/helpers";

type CSVRow = Record<string, unknown>;
type CSVData = readonly CSVRow[];

type CSVMetadata = {
  fileMeta: {
    name: string;
    mimeType: MIMEType;
    sizeInBytes: number;
  };
  csvMeta: Papa.ParseMeta;
  data: CSVData;
  errors: readonly Papa.ParseError[];
};

export function useCSV(): {
  csv: CSVMetadata | undefined;
  parseFile: (file: File | undefined) => void;
} {
  const [csv, setCSV] = useState<CSVMetadata | undefined>(undefined);

  const parseFile = (file: File | undefined) => {
    if (!file) {
      notifications.show({
        title: "No file selected",
        message: "Please select a file to import",
        color: "danger",
      });
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

        notifications.show({
          title: "CSV processed successfully",
          message: `${file.name} was processed successfully`,
          color: "success",
        });
      },
    });
  };

  return { csv, parseFile };
}
