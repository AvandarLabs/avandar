import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Positive integer effort weights define one exhaustive partition. */
export const inputSchema = z
  .strictObject({
    parentLabel: z.string().min(1).max(28),
    workItems: z
      .array(
        z.strictObject({
          id: z.string().max(16),
          label: z.string().min(1).max(18),
          effort: z.number().int().min(1).max(5),
        }),
      )
      .min(3)
      .max(6),
    unitLabel: z.string().min(1).max(16),
    groupingLabel: z.string().min(1).max(26),
    showEffortValues: z.boolean(),
    partitionLayout: z.enum(["strips", "alternating-cuts"]),
  })
  .refine(
    (input) =>
      new Set(input.workItems.map(prop("id"))).size === input.workItems.length,
    { path: ["workItems"], message: "Work item identities must be unique." },
  ) satisfies z.ZodType;
/** Validated authored partition input. */
export type Input = z.output<typeof inputSchema>;
/** The denominator is derived from all positive weights. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-work-identities",
    paths: ["workItems.*.id"],
    description:
      "All work item identities are unique, including at most one empty ID.",
  },
  {
    id: "exhaustive-work",
    paths: ["workItems.*.effort"],
    description:
      "The parent total is the sum of all effort weights. Every supplied piece belongs to that parent.",
  },
];
