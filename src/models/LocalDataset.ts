import Papa, { ParseMeta } from "papaparse";
import { match } from "ts-pattern";
import { z } from "zod";
import { LinkProps } from "@/components/ui/links/Link";
import * as DatasetField from "@/models/DatasetField";
import { CSVData, MIMEType } from "@/types/common";
import { Replace } from "@/types/utilityTypes";

export type Field = DatasetField.T;

/**
 * Local dataset type.
 *
 * For now, we only support CSVs.
 */
export type T = {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  sizeInBytes: number;
  mimeType: MIMEType;
  delimiter: string;
  firstRowIsHeader: boolean;
  fields: readonly Field[];

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
export type CreateT = Replace<T, { id: undefined }>;

/**
 * Zod schema for the local dataset type.
 */
export const Schema = z.object({
  id: z.number(),
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
  fields: z.array(DatasetField.Schema),
});

/**
 * React Query keys for the local datasets.
 */
export const QueryKeys = {
  allDatasets: "localDatasets",
};

export function create({
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
  fields: readonly Field[];
}): CreateT {
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
    data: unparse({ data, datasetType: fileMetadata.mimeType }),
    fields,
  };
}

/**
 * Returns the link props for a dataset to use in a `<Link>` component.
 */
export function getDatasetLinkProps(id: number): {
  to: LinkProps["to"];
  params: LinkProps["params"];
} {
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
export function unparse(options: {
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
