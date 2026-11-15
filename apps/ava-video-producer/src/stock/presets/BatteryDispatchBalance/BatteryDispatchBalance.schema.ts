import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/**
 * Complete authored input, with exact collection and accounting constraints.
 */
export const inputSchema = z
  .strictObject({
    battery: z.strictObject({
      capacityKwh: z.number().finite().gt(0).max(10000),
      initialStoredKwh: z.number().finite().min(0).max(10000),
    }),
    cycle: z.strictObject({
      chargeInputKwh: z.number().finite().min(0).max(10000),
      chargeLossKwh: z.number().finite().min(0).max(10000),
      deliveredKwh: z.number().finite().min(0).max(10000),
      dischargeLossKwh: z.number().finite().min(0).max(10000),
    }),
    windows: z.strictObject({
      chargeLabel: z.string().min(1).max(32),
      dispatchLabel: z.string().min(1).max(32),
      sourceLabel: z.string().min(1).max(32),
      loadLabel: z.string().min(1).max(32),
    }),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(32),
      actionLabel: z.string().min(1).max(32),
    }),
    showLossChannels: z.boolean(),
    orientation: z.enum(["horizontal", "vertical"]),
    copy: z.strictObject({
      capacity: z.string().min(0).max(26),
      stored: z.string().min(0).max(26),
      input: z.string().min(0).max(26),
      delivered: z.string().min(0).max(26),
      chargeLoss: z.string().min(0).max(26),
      dischargeLoss: z.string().min(0).max(26),
      unit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(48),
    }),
  })
  .superRefine((input, context) => {
    const { battery, cycle } = input;
    const peak =
      battery.initialStoredKwh + cycle.chargeInputKwh - cycle.chargeLossKwh;
    if (battery.initialStoredKwh > battery.capacityKwh) {
      context.addIssue({
        code: "custom",
        path: ["battery"],
        message: "Initial storage exceeds capacity.",
      });
    }
    if (cycle.chargeLossKwh > cycle.chargeInputKwh) {
      context.addIssue({
        code: "custom",
        path: ["cycle", "chargeLossKwh"],
        message: "Charging loss exceeds input.",
      });
    }
    if (peak > battery.capacityKwh) {
      context.addIssue({
        code: "custom",
        path: ["cycle"],
        message: "Peak storage exceeds capacity.",
      });
    }
    if (peak - cycle.deliveredKwh - cycle.dischargeLossKwh < 0) {
      context.addIssue({
        code: "custom",
        path: ["cycle"],
        message: "Dispatch exceeds stored energy.",
      });
    }
  }) satisfies z.ZodType;
/** Inferred complete scene input. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules that structural JSON Schema cannot express. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "initial-capacity",
    paths: ["battery.initialStoredKwh", "battery.capacityKwh"],
    description: "Initial stored energy is between zero and usable capacity.",
  },
  {
    id: "charge-loss",
    paths: ["cycle.chargeLossKwh", "cycle.chargeInputKwh"],
    description: "Charge loss cannot exceed charge input.",
  },
  {
    id: "peak-capacity",
    paths: ["battery", "cycle"],
    description:
      "Peak stored = initialStoredKwh + chargeInputKwh - chargeLossKwh must not exceed capacityKwh.",
  },
  {
    id: "final-nonnegative",
    paths: ["battery", "cycle"],
    description:
      "Final stored = initialStoredKwh + chargeInputKwh - chargeLossKwh - deliveredKwh - dischargeLossKwh must be at least zero.",
  },
];
