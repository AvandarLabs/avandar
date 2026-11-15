import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input with cross-field validation. */
export const inputSchema = z
  .strictObject({
    event: z.strictObject({
      incomingM3: z.number().gt(0).max(10000),
      infiltratedM3: z.number().min(0).max(10000),
      dischargedM3: z.number().min(0).max(10000),
    }),
    detentionCapacityM3: z.number().min(0).max(10000),
    boundary: z.strictObject({
      locationLabel: z.string().min(1).max(42),
      periodLabel: z.string().min(1).max(42),
    }),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(32),
      actionLabel: z.string().min(1).max(32),
    }),
    overflowSide: z.enum(["left", "right"]),
    showBalance: z.boolean(),
    copy: z.strictObject({
      inflow: z.string().min(0).max(30),
      infiltration: z.string().min(0).max(30),
      discharge: z.string().min(0).max(30),
      detained: z.string().min(0).max(30),
      overflow: z.string().min(0).max(30),
      capacity: z.string().min(0).max(30),
      unit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(50),
    }),
  })
  .superRefine((input, context) => {
    if (
      input.event.infiltratedM3 + input.event.dischargedM3 >
      input.event.incomingM3
    ) {
      context.addIssue({
        code: "custom",
        path: ["event"],
        message:
          "Infiltration plus controlled discharge cannot exceed incoming volume.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Complete runtime-only and editorial constraints for consumers. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "stormwater-storage-spill.0",
    paths: ["event.incomingM3", "event.infiltratedM3", "event.dischargedM3"],
    description:
      "Infiltrated plus discharged volume must be <= incoming volume.",
  },
  {
    id: "stormwater-storage-spill.1",
    paths: ["event", "detentionCapacityM3"],
    description:
      "Detention is min(capacity, incoming - (infiltrated + discharged)); overflow is the remaining volume. Incoming equals all four destinations. Zero capacity and arbitrarily small positive incoming values are accepted.",
  },
  {
    id: "stormwater-storage-spill.2",
    paths: ["copy.unit", "boundary"],
    description:
      "The author retains cubic-metre meaning and identifies geography as schematic.",
  },
];
