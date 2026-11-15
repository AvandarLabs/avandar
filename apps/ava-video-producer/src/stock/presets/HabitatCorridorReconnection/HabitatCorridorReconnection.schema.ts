import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/**
 * Complete authored input, with exact collection and accounting constraints.
 */
export const inputSchema = z
  .strictObject({
    patches: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(24),
          areaHa: z.number().finite().gt(0).max(10000),
        }),
      )
      .min(2)
      .max(2),
    corridor: z.strictObject({
      label: z.string().min(0).max(32),
      lengthM: z.number().finite().gt(0).max(10000),
      widthM: z.number().finite().gt(0).max(10000),
      fromPatchId: z.string().min(0).max(20),
      toPatchId: z.string().min(0).max(20),
    }),
    landBoundaryHa: z.number().finite().min(0).max(100000),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(34),
      actionLabel: z.string().min(1).max(34),
      stage: z.enum(["proposal", "implemented"]),
    }),
    showIllustrativeTraversal: z.boolean(),
    showLandBalance: z.boolean(),
    copy: z.strictObject({
      map: z.string().min(0).max(28),
      barrier: z.string().min(0).max(28),
      crossing: z.string().min(0).max(28),
      habitat: z.string().min(0).max(28),
      otherLand: z.string().min(0).max(28),
      proposal: z.string().min(0).max(28),
      implemented: z.string().min(0).max(28),
      traversal: z.string().min(0).max(28),
      areaUnit: z.string().min(0).max(8),
      lengthUnit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(54),
    }),
  })
  .superRefine((input, context) => {
    const { patches, corridor, landBoundaryHa } = input;
    if (new Set(patches.map(prop("id"))).size !== patches.length) {
      context.addIssue({
        code: "custom",
        path: ["patches"],
        message: "Patch IDs must be unique.",
      });
    }
    if (
      corridor.fromPatchId === corridor.toPatchId ||
      ![corridor.fromPatchId, corridor.toPatchId].every((id) =>
        patches.some(propEq("id", id)),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["corridor"],
        message: "Corridor endpoints must be distinct existing patches.",
      });
    }
    if (
      patches.reduce((total, patch) => total + patch.areaHa, 0) +
        (corridor.lengthM * corridor.widthM) / 10000 >
      landBoundaryHa
    ) {
      context.addIssue({
        code: "custom",
        path: ["landBoundaryHa"],
        message: "Patch and corridor areas exceed the fixed boundary.",
      });
    }
  }) satisfies z.ZodType;
/** Inferred complete scene input. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules that structural JSON Schema cannot express. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-patches",
    paths: ["patches.*.id"],
    description:
      "The two patch IDs are unique, including at most one empty ID.",
  },
  {
    id: "endpoints",
    paths: ["corridor.fromPatchId", "corridor.toPatchId", "patches.*.id"],
    description:
      "Both endpoints are existing patch IDs and differ from each other. Empty references are valid when the empty patch ID exists.",
  },
  {
    id: "land-conservation",
    paths: [
      "landBoundaryHa",
      "patches.*.areaHa",
      "corridor.lengthM",
      "corridor.widthM",
    ],
    description:
      "The fixed land boundary is at least sum(patch areas) + lengthM * widthM / 10000. The rectangular corridor area transfers from other land, including an exactly zero remainder, and is not added to the boundary.",
  },
];
