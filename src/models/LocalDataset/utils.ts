import Papa, { ParseMeta } from "papaparse";
import { match } from "ts-pattern";
import { MIMEType, RawCellValue, RawDataset } from "@/lib/types/common";
import { assert } from "@/lib/utils/guards";
import { uuid } from "@/lib/utils/uuid";
import { WorkspaceId } from "../Workspace/types";
import { LocalDatasetField } from "./LocalDatasetField/types";
import { FileMetadata, LocalDataset, LocalDatasetId } from "./types";

export function asLocalDatasetId(id: string): LocalDatasetId {
  assert(typeof id === "string", "Expected a string as a LocalDatasetId");
  return id as LocalDatasetId;
}

export function makeLocalDataset({
  name,
  workspaceId,
  datasetType,
  description,
  fileMetadata,
  csvMetadata,
  data,
  fields,
}: {
  name: string;
  workspaceId: WorkspaceId;
  datasetType: LocalDataset["datasetType"];
  description: string;
  fileMetadata: FileMetadata;
  csvMetadata: ParseMeta;
  data: RawDataset;
  fields: readonly LocalDatasetField[];
}): LocalDataset<"Insert"> {
  const creationTime = new Date();
  return {
    id: asLocalDatasetId(uuid()),
    workspaceId,
    name,
    datasetType,
    firstRowIsHeader: true,
    mimeType: fileMetadata.mimeType,
    description,
    createdAt: creationTime,
    updatedAt: creationTime,
    sizeInBytes: fileMetadata.sizeInBytes,
    delimiter: csvMetadata.delimiter,
    data: unparseDataset({
      data,
      datasetType: MIMEType.TEXT_CSV,
    }),
    fields,
  };
}

/**
 * Convert a dataset back into a raw string. Only CSVs are supported for now.
 * @param options
 * @returns
 */
export function unparseDataset(
  options:
    | {
        datasetType: MIMEType.TEXT_CSV;
        data: RawDataset;
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
