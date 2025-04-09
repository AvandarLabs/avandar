import * as arrow from "apache-arrow";
import { match } from "ts-pattern";
import { z } from "zod";
import { UUID } from "@/lib/types/common";

export type FieldDataType = "string" | "number" | "date" | "unknown";

export type DatasetFieldId = UUID;
export type DatasetField = {
  id: DatasetFieldId;
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

export function getArrowDataType(dataType: FieldDataType): arrow.DataType {
  return match(dataType)
    .with("string", () => {
      return new arrow.Utf8();
    })
    .with("number", () => {
      return new arrow.Float64();
    })
    .with("date", () => {
      return new arrow.TimestampMillisecond();
    })
    .with("unknown", () => {
      // treat unknowns as strings
      return new arrow.Utf8();
    })
    .exhaustive();
}
