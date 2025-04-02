import { LinkProps } from "@tanstack/react-router";
import { z } from "zod";
import { CSVData } from "@/types/helpers";

/**
 * Local dataset type.
 */
export type T = {
  id: string; // uuid
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  data: CSVData;
};

/**
 * Zod schema for the local dataset type.
 */
export const Schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // we do not get more specific to not affect performance, because
  // CSVs can be large
  data: z.array(z.unknown()).transform((val) => {
    return val as CSVData; // force CSVData type to be inferred
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
export function getDatasetLinkProps(id: string): LinkProps {
  return {
    to: `/data-manager/$datasetId`,
    params: {
      datasetId: id,
    },
  };
}
