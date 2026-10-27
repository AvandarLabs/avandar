import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
/** Strict authored input structure. */
const structure = z.strictObject({
  records: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(20),
        eventBinId: z.string().max(12),
        firstSnapshot: z.union([z.literal(0), z.literal(1)]),
      }),
    )
    .min(3)
    .max(12),
  eventBins: z
    .array(
      z.strictObject({ id: z.string().max(12), label: z.string().max(16) }),
    )
    .min(3)
    .max(5),
  snapshots: z
    .array(z.strictObject({ label: z.string().max(32) }))
    .min(2)
    .max(2),
  copy: z.strictObject({
    context: z.string().max(40),
    axis: z.string().max(40),
    unit: z.string().max(40),
    earlier: z.string().max(40),
    revised: z.string().max(40),
    newReports: z.string().max(40),
  }),
  showPriorOutline: z.boolean(),
}) satisfies z.ZodType;

type SchemaInput = z.infer<typeof structure>;
/** Strict unique records with authored event-bin references. */
export const inputSchema = structure
  .refine(
    (input) =>
      new Set(input.records.map(prop("id"))).size === input.records.length &&
      new Set(input.eventBins.map(prop("id"))).size === input.eventBins.length,
    "Record and bin IDs must be unique.",
  )
  .refine(
    (input) =>
      input.records.every((record) =>
        input.eventBins.some(propEq("id", record.eventBinId)),
      ) &&
      [0, 1].every((snapshot) =>
        input.records.some(
          propEq<{ firstSnapshot: unknown }, "firstSnapshot", unknown>(
            "firstSnapshot",
            snapshot,
          ),
        ),
      ),
    "Records reference existing bins and both snapshots have at least one first appearance.",
  ) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime-only semantic constraints. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "identities",
    paths: ["records.*.id", "eventBins.*.id"],
    description:
      "Record IDs and event-bin IDs are unique within their collections, allowing one empty ID.",
  },
  {
    id: "references",
    paths: ["records.*.eventBinId", "eventBins"],
    description: "Every record references an existing event-bin ID.",
  },
  {
    id: "appearances",
    paths: ["records.*.firstSnapshot"],
    description:
      "Both snapshots have at least one first appearance. Each record contributes once to its event-date bin from its first snapshot onward.",
  },
  {
    id: "authored-chronology",
    paths: ["eventBins", "snapshots"],
    description:
      "The author supplies chronological reporting cutoffs and event bins preceding their receipt cutoff. Labels are not parsed as dates; no absolute dates are modeled.",
  },
];
