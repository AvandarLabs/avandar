import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete bounded authored inputs, with no partial defaults. */
export const inputSchema = z
  .strictObject({
    entries: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(22),
          value: z.string().min(0).max(28),
        }),
      )
      .min(1)
      .max(4),
    surfaceLabel: z.string().min(1).max(32),
    copy: z.strictObject({
      connected: z.string().min(1).max(32),
      offline: z.string().min(1).max(32),
      storage: z.string().min(1).max(32),
      retained: z.string().min(1).max(32),
      example: z.string().min(1).max(32),
    }),
    deviceShape: z.enum(["tablet", "laptop", "notebook"]),
    showStorageImpressions: z.boolean(),
    showLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const identifiers = input.entries.map(prop("id"));
    if (new Set(identifiers).size !== identifiers.length) {
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "Item identifiers must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred authored content. */
export type Input = z.output<typeof inputSchema>;
/** Runtime relations supplement structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identifiers",
    paths: ["entries.*.id"],
    description: "Supplied item identifiers are unique.",
  },
];
