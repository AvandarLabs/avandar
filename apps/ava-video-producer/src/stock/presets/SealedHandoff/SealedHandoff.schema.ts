import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete bounded authored inputs, with no partial defaults. */
export const inputSchema = z
  .strictObject({
    brief: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          line: z.string().min(1).max(36),
        }),
      )
      .min(1)
      .max(4),
    address: z.strictObject({
      sender: z.string().min(1).max(28),
      recipient: z.string().min(1).max(28),
      reference: z.string().min(1).max(28),
    }),
    copy: z.strictObject({
      contents: z.string().min(1).max(34),
      covered: z.string().min(1).max(34),
      received: z.string().min(1).max(34),
      opened: z.string().min(1).max(34),
      example: z.string().min(1).max(34),
    }),
    revealRule: z.enum(["recipient", "remain-sealed"]),
    showExteriorReference: z.boolean(),
    showLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const identifiers = input.brief.map(prop("id"));
    if (new Set(identifiers).size !== identifiers.length) {
      context.addIssue({
        code: "custom",
        path: ["brief"],
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
    paths: ["brief.*.id"],
    description: "Supplied item identifiers are unique.",
  },
];
