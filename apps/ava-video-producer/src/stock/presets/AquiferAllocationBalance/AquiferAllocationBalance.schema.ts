import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/**
 * Complete authored input, with exact collection and accounting constraints.
 */
export const inputSchema = z
  .strictObject({
    aquifer: z.strictObject({
      initialM3: z.number().finite().min(0).max(1000000),
      diagramCapacityM3: z.number().finite().gt(0).max(1000000),
    }),
    flows: z.strictObject({
      rechargeM3: z.number().finite().min(0).max(1000000),
      naturalOutflowM3: z.number().finite().min(0).max(1000000),
      requestedWithdrawalM3: z.number().finite().min(0).max(1000000),
      approvedWithdrawalM3: z.number().finite().min(0).max(1000000),
    }),
    boundary: z.strictObject({
      label: z.string().min(1).max(44),
      periodLabel: z.string().min(1).max(44),
      scopeLabel: z.string().min(1).max(44),
    }),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(34),
      actionLabel: z.string().min(1).max(34),
    }),
    showUnallocatedRequest: z.boolean(),
    copy: z.strictObject({
      initial: z.string().min(0).max(28),
      recharge: z.string().min(0).max(28),
      naturalOutflow: z.string().min(0).max(28),
      requested: z.string().min(0).max(28),
      approved: z.string().min(0).max(28),
      unallocated: z.string().min(0).max(28),
      final: z.string().min(0).max(28),
      unit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(56),
    }),
  })
  .superRefine((input, context) => {
    const { aquifer, flows } = input;
    if (aquifer.initialM3 > aquifer.diagramCapacityM3) {
      context.addIssue({
        code: "custom",
        path: ["aquifer"],
        message: "Initial storage exceeds the diagram capacity.",
      });
    }
    if (flows.approvedWithdrawalM3 > flows.requestedWithdrawalM3) {
      context.addIssue({
        code: "custom",
        path: ["flows"],
        message: "Approval exceeds the request.",
      });
    }
    if (aquifer.initialM3 + flows.rechargeM3 > aquifer.diagramCapacityM3) {
      context.addIssue({
        code: "custom",
        path: ["flows", "rechargeM3"],
        message: "Recharge exceeds diagram capacity.",
      });
    }
    if (
      aquifer.initialM3 +
        flows.rechargeM3 -
        flows.naturalOutflowM3 -
        flows.approvedWithdrawalM3 <
      0
    ) {
      context.addIssue({
        code: "custom",
        path: ["flows"],
        message: "Executed flows exceed available water.",
      });
    }
  }) satisfies z.ZodType;
/** Inferred complete scene input. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules that structural JSON Schema cannot express. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "initial-capacity",
    paths: ["aquifer"],
    description: "Initial storage is between zero and diagramCapacityM3.",
  },
  {
    id: "approval",
    paths: ["flows.approvedWithdrawalM3", "flows.requestedWithdrawalM3"],
    description: "Approved withdrawal cannot exceed requested withdrawal.",
  },
  {
    id: "recharge-capacity",
    paths: ["aquifer", "flows.rechargeM3"],
    description:
      "Initial storage plus recharge cannot exceed diagram capacity.",
  },
  {
    id: "nonnegative-final",
    paths: ["aquifer.initialM3", "flows"],
    description:
      "Final storage = initialM3 + rechargeM3 - naturalOutflowM3 - approvedWithdrawalM3 must be at least zero. Requested and unallocated quantities are not executed water flows.",
  },
];
