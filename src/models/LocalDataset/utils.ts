import { LinkProps } from "@tanstack/react-router";
import Papa, { ParseMeta } from "papaparse";
import { match } from "ts-pattern";
import { CSVData, MIMEType } from "@/lib/types/common";
import { assert } from "@/lib/utils/guards";
import { uuid } from "@/lib/utils/uuid";
import { LocalDatasetField } from "./LocalDatasetField/types";
import { FileMetadata, LocalDataset, LocalDatasetId } from "./types";

export function asLocalDatasetId(id: string): LocalDatasetId {
  assert(typeof id === "string", "Expected a string as a LocalDatasetId");
  return id as LocalDatasetId;
}

export function makeLocalDataset({
  name,
  datasetType,
  description,
  fileMetadata,
  csvMetadata,
  data,
  fields,
}: {
  name: string;
  datasetType: LocalDataset["datasetType"];
  description: string;
  fileMetadata: FileMetadata;
  csvMetadata: ParseMeta;
  data: CSVData;
  fields: readonly LocalDatasetField[];
}): LocalDataset<"Insert"> {
  const creationTime = new Date();
  return {
    id: asLocalDatasetId(uuid()),
    name,
    datasetType,
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

/**
 * Returns true if the dataset is viewable in the Data Manager navbar.
 * @param dataset
 * @returns boolean
 */
export function isDatasetViewableType(dataset: LocalDataset): boolean {
  return match(dataset.datasetType)
    .with("upload", "entities_queryable", () => {
      return true;
    })
    .with("entities", "entity_field_values", () => {
      return false;
    })
    .exhaustive(() => {
      return false;
    });
}
