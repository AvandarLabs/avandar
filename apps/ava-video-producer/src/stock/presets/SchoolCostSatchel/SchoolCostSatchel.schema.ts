import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input and runtime cross-field constraints. */
export const inputSchema = z
  .strictObject({
    expenses: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(22),
          object: z.enum(["book", "ticket", "clothing", "meal", "fee-slip"]),
          amount: z.number().int().min(0).max(20),
        }),
      )
      .min(2)
      .max(5),
    periodLabel: z.string().min(1).max(32),
    unitLabel: z.string().min(1).max(18),
    sceneLabels: z.strictObject({
      learner: z.string().min(1).max(24),
      school: z.string().min(1).max(24),
      total: z.string().min(1).max(24),
    }),
    showExpenseShares: z.boolean(),
    unpackOrder: z.enum(["input-order", "largest-first"]),
    caption: z.string().min(1).max(56),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.expenses.map(prop("id"))).size !== input.expenses.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["expenses"],
        message: "Expense IDs must be unique.",
      });
    }
    if (input.expenses.reduce((sum, expense) => sum + expense.amount, 0) <= 0) {
      context.addIssue({
        code: "custom",
        path: ["expenses"],
        message: "The authored total must be positive.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "school-cost-satchel.0",
    paths: ["expenses.*.id"],
    description:
      "Expense IDs are unique. Each entry is one distinct authored cost, never the same cost counted twice. IDs establish authored cost identity. Equal label/object/amount tuples with distinct IDs remain valid. Underlying real-world duplicate costs cannot be detected from these fields.",
  },
  {
    id: "school-cost-satchel.1",
    paths: ["expenses.*.amount"],
    description:
      "Integer amounts are 0..20 and their sum must be positive. Sum every authored period-normalized amount once.",
  },
  {
    id: "school-cost-satchel.2",
    paths: [
      "expenses",
      "periodLabel",
      "unitLabel",
      "showExpenseShares",
      "unpackOrder",
    ],
    description:
      "All amounts use the supplied period and unit without recurring multipliers or conversions. Shares divide by their sum. Largest-first preserves input order for ties.",
  },
];
