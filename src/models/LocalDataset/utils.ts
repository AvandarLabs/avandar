import { LinkProps } from "@tanstack/react-router";
import Papa, { ParseMeta } from "papaparse";
import { match } from "ts-pattern";
import { CSVData, MIMEType } from "@/lib/types/common";
import { uuid } from "@/lib/utils/uuid";
import { LocalDatasetField } from "./LocalDatasetField/types";
import { FileMetadata, LocalDataset, LocalDatasetId } from "./types";

export function makeLocalDataset({
  name,
  description,
  fileMetadata,
  csvMetadata,
  data,
  fields,
}: {
  name: string;
  description: string;
  fileMetadata: FileMetadata;
  csvMetadata: ParseMeta;
  data: CSVData;
  fields: readonly LocalDatasetField[];
}): LocalDataset<"Insert"> {
  const creationTime = new Date();
  return {
    id: uuid(),
    name,
    firstRowIsHeader: true,
    mimeType: fileMetadata.mimeType,
    description,
    createdAt: creationTime,
    updatedAt: creationTime,
    sizeInBytes: fileMetadata.sizeInBytes,
    delimiter: csvMetadata.delimiter,
    data: unparseDataset({ data, datasetType: fileMetadata.mimeType }),
    fields,
  };
}

/**
 * Returns the link props for a dataset to use in a `<Link>` component.
 */
export function getDatasetLinkProps(
  id: LocalDatasetId,
): Pick<LinkProps, "to" | "params"> {
  return {
    to: `/data-manager/$datasetId`,
    params: {
      datasetId: id.toString(),
    },
  };
}

/**
 * Convert a dataset back into a raw string. Only CSVs are supported for now.
 * @param options
 * @returns
 */
export function unparseDataset(options: {
  datasetType: MIMEType;
  data: CSVData;
}): string {
  const { datasetType, data } = options;
  const result = match(datasetType)
    .with("text/csv", () => {
      return Papa.unparse(data, {
        header: true,
        delimiter: ",",
        newline: "\n",
      });
    })
    .otherwise(() => {
      throw new Error("Unsupported dataset type for local storage.");
    });
  return result;
}
