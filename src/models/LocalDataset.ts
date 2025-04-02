import { LinkProps } from "@tanstack/react-router";
import { z } from "zod";
import { CSVData, MIMEType } from "@/types/common";
import { Replace } from "@/types/utils";

/**
 * Local dataset type.
 */
export type T = {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  sizeInBytes: number;
  mimeType: MIMEType;
  data: CSVData;
};

/**
 * Dataset type for creating a new dataset.
 *
 * `id` is undefined because it is autoincremented when inserting.
 */
export type CreateT = Replace<T, "id", undefined>;

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

  // we do not get more specific to not affect performance, because
  // CSVs can be large
  data: z.array(z.unknown()).transform((val) => {
    return val as CSVData; // force type inference
  }),
});

/**
 * React Query keys for the local datasets.
 */
export const QueryKeys = {
  allDatasets: "localDatasets",
};

/**
 * Returns the link props for a dataset to use in a `<Link>` component.
 */
export function getDatasetLinkProps(id: number): LinkProps {
  return {
    to: `/data-manager/$datasetId`,
    params: {
      datasetId: id.toString(),
    },
  };
}
