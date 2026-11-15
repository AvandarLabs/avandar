import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and cross-field validation. */
export const inputSchema = z
  .strictObject({
    capture: z.strictObject({
      capturedTonnesCO2: z.number().finite().gt(0).max(1000),
      releasedTonnesCO2: z.number().finite().min(0).max(1000),
    }),
    operatingEmissions: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(26),
          tonnesCO2e: z.number().finite().min(0).max(1000),
        }),
      )
      .min(1)
      .max(3),
    boundary: z.strictObject({
      label: z.string().min(1).max(44),
      periodLabel: z.string().min(1).max(44),
      includedActivities: z.string().min(1).max(44),
    }),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(32),
      actionLabel: z.string().min(1).max(32),
    }),
    showNetAccounting: z.boolean(),
    view: z.enum(["cutaway", "above-ground-vessel"]),
    copy: z.strictObject({
      air: z.string().min(0).max(30),
      capture: z.string().min(0).max(30),
      retained: z.string().min(0).max(30),
      released: z.string().min(0).max(30),
      operations: z.string().min(0).max(30),
      net: z.string().min(0).max(30),
      massUnit: z.string().min(0).max(10),
      accountingUnit: z.string().min(0).max(10),
      disclaimer: z.string().min(0).max(48),
    }),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (input.capture.releasedTonnesCO2 > input.capture.capturedTonnesCO2) {
      issue("capture", "Released cannot exceed captured CO2.");
    }
    if (
      new Set(input.operatingEmissions.map(prop("id"))).size !==
      input.operatingEmissions.length
    ) {
      issue("operatingEmissions", "Emission row IDs must be unique.");
    }
  }) satisfies z.ZodType;
/** Input inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "carbon-storage-accounting.0",
    paths: ["capture.capturedTonnesCO2", "capture.releasedTonnesCO2"],
    description:
      "Captured is finite >0 and <=1000, including positive sub-unit values with no invented minimum. Released is finite 0..captured. Retained = captured - released.",
  },
  {
    id: "carbon-storage-accounting.1",
    paths: ["operatingEmissions.*.id", "operatingEmissions.*.tonnesCO2e"],
    description:
      "Emission row IDs are unique, including at most one empty ID. Sum all 1..3 finite 0..1000 CO2e rows once. Net = retained CO2 expressed as CO2e at factor one minus that sum. Preserve negative results.",
  },
  {
    id: "carbon-storage-accounting.2",
    paths: ["boundary", "copy.massUnit", "copy.accountingUnit"],
    description:
      "Author validates a common reporting boundary and preserves physical tonnes CO2 versus accounting tonnes CO2e units. No other captured gas or durability inference.",
  },
];
