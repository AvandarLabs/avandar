import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored document with exact collection and reference bounds. */
export const inputSchema = z
  .strictObject({
    leftRows: z
      .array(
        z.strictObject({
          key: z.string().min(1).max(10),
          value: z.string().min(0).max(24),
        }),
      )
      .min(1)
      .max(4),
    rightRows: z
      .array(
        z.strictObject({
          key: z.string().min(1).max(10),
          value: z.string().min(0).max(24),
        }),
      )
      .min(1)
      .max(4),
    joinType: z.enum(["inner", "left"]),
    labels: z.strictObject({
      title: z.string().min(0).max(40),
      left: z.string().min(1).max(24),
      right: z.string().min(1).max(24),
      key: z.string().min(1).max(24),
      result: z.string().min(1).max(24),
      unmatched: z.string().min(1).max(24),
      missing: z.string().min(1).max(24),
    }),
    showKeys: z.boolean(),
    showUnmatchedTray: z.boolean(),
  })
  .superRefine((input, context) => {
    ["leftRows", "rightRows"].forEach((side) => {
      const rows = input[side as "leftRows" | "rightRows"];
      if (
        new Set(rows.map(prop<{ key: string }, "key", string>("key"))).size !==
        rows.length
      ) {
        context.addIssue({
          code: "custom",
          path: [side],
          message: "Keys must be unique within each table.",
        });
      }
    });
    if (
      !input.leftRows.some((left) =>
        input.rightRows.some(propEq("key", left.key)),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["rightRows"],
        message: "At least one exact shared key is required.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Cross-reference constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-keys",
    paths: ["leftRows.*.key", "rightRows.*.key"],
    description:
      "Keys are unique within each table and equality is exact and case-sensitive.",
  },
  {
    id: "shared-key",
    paths: ["leftRows", "rightRows"],
    description: "At least one exact shared key is required.",
  },
];
