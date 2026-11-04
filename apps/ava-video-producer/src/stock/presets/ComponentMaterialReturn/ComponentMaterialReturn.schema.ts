import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input with cross-field validation. */
export const inputSchema = z
  .strictObject({
    parts: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(22),
          massKg: z.number().gt(0).max(100),
          route: z.enum(["reuse", "repair", "recycle", "residue"]),
        }),
      )
      .min(2)
      .max(6),
    replacementInputs: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(26),
          massKg: z.number().gt(0).max(100),
        }),
      )
      .min(0)
      .max(3),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(34),
      actionLabel: z.string().min(1).max(34),
    }),
    assemblyShape: z.enum(["appliance", "equipment-module"]),
    showMassEquation: z.boolean(),
    copy: z.strictObject({
      returned: z.string().min(0).max(30),
      replacement: z.string().min(0).max(30),
      reuse: z.string().min(0).max(30),
      repair: z.string().min(0).max(30),
      recycle: z.string().min(0).max(30),
      residue: z.string().min(0).max(30),
      output: z.string().min(0).max(30),
      unit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(48),
    }),
  })
  .superRefine((input, context) => {
    const identities = [...input.parts, ...input.replacementInputs].map(
      prop("id"),
    );
    if (new Set(identities).size !== identities.length) {
      context.addIssue({
        code: "custom",
        path: ["parts", "replacementInputs"],
        message:
          "Part and replacement IDs must be unique across both collections, including an empty ID.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Complete runtime-only and editorial constraints for consumers. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "component-material-return.0",
    paths: ["parts.*.id", "replacementInputs.*.id"],
    description:
      "All IDs must be unique across both collections, including at most one empty ID.",
  },
  {
    id: "component-material-return.1",
    paths: ["parts.*.massKg", "parts.*.route", "replacementInputs.*.massKg"],
    description:
      "Every original part follows exactly one declared route. Assembled mass is reuse + repair + all replacement inputs; returned + replacement = assembled + recycling + residue. Empty replacement collection and zero assembled mass are accepted.",
  },
  {
    id: "component-material-return.2",
    paths: ["copy.unit", "assemblyShape"],
    description:
      "The author retains kilogram units. Repair success and compatibility are supplied assumptions; recycling-stream mass is not a recovery yield.",
  },
];
