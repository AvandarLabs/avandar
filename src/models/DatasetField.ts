import { z } from "zod";
import { UUID } from "@/lib/types/common";

export type FieldDataType = "string" | "number" | "date" | "unknown";

export type DatasetField = {
  id: UUID;
  name: string;
  dataType: FieldDataType;
  description?: string;
};

export const DatasetFieldSchema = z.object({
  id: z
    .string()
    .uuid()
    .transform((id) => {
      return id as UUID;
    }),
  name: z.string().min(1),
  dataType: z.enum(["string", "number", "date", "unknown"]),
  description: z.string().optional(),
});
