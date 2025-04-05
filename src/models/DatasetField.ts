import { z } from "zod";
import { UUID } from "@/types/common";

export type T = {
  id: UUID;
  name: string;
  dataType: "string" | "number" | "date" | "boolean";
  description?: string;
};

export const Schema = z.object({
  id: z
    .string()
    .uuid()
    .transform((id) => {
      return id as UUID;
    }),
  name: z.string().min(1),
  dataType: z.enum(["string", "number", "date", "boolean"]),
  description: z.string().optional(),
});
