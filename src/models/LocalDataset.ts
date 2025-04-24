import Papa, { ParseMeta } from "papaparse";
import { match } from "ts-pattern";
import { Merge } from "type-fest";
import { z } from "zod";
import { CSVData, MIMEType } from "@/lib/types/common";
import { LinkProps } from "@/lib/ui/links/Link";
import { stringToBrandedUUID } from "@/lib/utils/zodHelpers";
import { DatasetFieldSchema } from "@/models/DatasetField";
import type { UUID } from "@/lib/types/common";
import type { DatasetField } from "@/models/DatasetField";

export type LocalDatasetId = UUID<"LocalDataset">;

/**
 * Local dataset type.
 *
 * For now, we only support CSVs.
 */
export type LocalDataset = {
  id: LocalDatasetId;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  sizeInBytes: number;
  mimeType: MIMEType;
  delimiter: string;
  firstRowIsHeader: boolean;
  fields: readonly DatasetField[];

  /**
   * All data is represented as a single string to take up less space.
   * This needs to be parsed.
   */
  data: string;
};

/**
 * Metadata about the parsed file itself.
 */
export type FileMetadata = {
  name: string;
  mimeType: MIMEType;
  sizeInBytes: number;
};

/**
 * Dataset type for creating a new dataset.
 *
 * `id` is undefined because it is autoincremented when inserting.
 */
export type LocalDatasetCreate = Merge<LocalDataset, { id: undefined }>;

/**
 * Zod schema for the local dataset type.
 */
export const LocalDatasetSchema = z.object({
  id: stringToBrandedUUID<LocalDatasetId>(),
  name: z.string().min(1),
  description: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sizeInBytes: z.number(),
  mimeType: z.string().transform((val) => {
    return val as MIMEType; // force type inference
  }),
  data: z.string(),
  delimiter: z.string(),
  firstRowIsHeader: z.boolean(),
  fields: z.array(DatasetFieldSchema),
});

/**
 * React Query keys for the local datasets.
 */
export const LocalDatasetQueryKeys = {
  allDatasets: ["localDatasets"],
};

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
  fields: readonly DatasetField[];
}): LocalDatasetCreate {
  const creationTime = new Date();
  return {
    id: undefined,
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
