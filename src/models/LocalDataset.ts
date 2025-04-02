import { z } from "zod";
import { CSVData } from "@/types/helpers";

export type T = {
  id: string; // uuid
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  data: CSVData;
};

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

export const QueryKeys = {
  allDatasets: "localDatasets",
};
