import { z } from "zod";
import { uuidType } from "@/lib/utils/zodHelpers";
import { LocalDatasetFieldId } from "./types";

export const LocalDatasetFieldSchema = z.object({
  id: uuidType<LocalDatasetFieldId>(),
  name: z.string().min(1),
  dataType: z.enum(["string", "number", "date"]),
  description: z.string().optional(),
});
