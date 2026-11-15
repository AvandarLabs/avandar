import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete bounded authored inputs, with no partial defaults. */
export const inputSchema = z
  .strictObject({
    fields: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(22),
          value: z.string().min(0).max(28),
          disclosure: z.enum(["retain", "share"]),
        }),
      )
      .min(1)
      .max(5),
    copy: z.strictObject({
      source: z.string().min(1).max(32),
      boundary: z.string().min(1).max(32),
      destination: z.string().min(1).max(32),
      retain: z.string().min(1).max(32),
      share: z.string().min(1).max(32),
      example: z.string().min(1).max(32),
    }),
    direction: z.enum(["left-to-right", "right-to-left"]),
    showPolicyMarks: z.boolean(),
    showValues: z.boolean(),
    showLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const identifiers = input.fields.map(prop("id"));
    if (new Set(identifiers).size !== identifiers.length) {
      context.addIssue({
        code: "custom",
        path: ["fields"],
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
    paths: ["fields.*.id"],
    description: "Supplied item identifiers are unique.",
  },
];
