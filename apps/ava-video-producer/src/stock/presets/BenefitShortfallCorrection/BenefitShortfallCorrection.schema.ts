import { prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      participant: z.string().min(0).max(26),
      worker: z.string().min(0).max(26),
    }),
    payments: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(24),
          statedUnits: z.number().int().min(1).max(8),
          receivedUnits: z.number().int().min(0).max(8),
          correctionUnits: z.number().int().min(0).max(8),
        }),
      )
      .min(1)
      .max(2),
    unitLabel: z.string().min(1).max(24),
    labels: z.strictObject({
      stated: z.string().min(0).max(26),
      received: z.string().min(0).max(26),
      correction: z.string().min(0).max(26),
      unresolved: z.string().min(0).max(26),
    }),
    showTotals: z.boolean(),
    exampleLabel: z.string().min(1).max(32),
  })
  .refine(
    (input) =>
      new Set(input.payments.map(prop("id"))).size === input.payments.length,
    { path: ["payments"], message: "Payment IDs must be unique." },
  )
  .refine(
    (input) =>
      input.payments.every(
        (payment) =>
          payment.receivedUnits + payment.correctionUnits <=
          payment.statedUnits,
      ),
    {
      path: ["payments"],
      message: "Corrections cannot exceed the original shortfall.",
    },
  )
  .refine(
    (input) =>
      input.payments.reduce(
        (total, payment) => total + payment.statedUnits,
        0,
      ) <= 12,
    {
      path: ["payments"],
      message: "At most twelve stated units are supported.",
    },
  )
  .refine(
    (input) =>
      input.payments.some(
        (payment) => payment.receivedUnits < payment.statedUnits,
      ),
    { path: ["payments"], message: "An original shortfall is required." },
  ) satisfies z.ZodType;
/** Schema-inferred scene input. */
export type Input = z.infer<typeof inputSchema>;

/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "unique-payments",
    paths: ["payments.*.id"],
    description: "Payment IDs are unique, including at most one empty ID.",
  },
  {
    id: "payment-conservation",
    paths: ["payments"],
    description:
      "For every payment, receivedUnits + correctionUnits <= statedUnits. Total statedUnits <= 12. At least one payment has receivedUnits < statedUnits.",
  },
];
