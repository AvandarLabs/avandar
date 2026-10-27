import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** A finite lease has exactly one referenced holder and a positive lifetime. */
export const inputSchema = z
  .strictObject({
    participants: z
      .array(
        z.strictObject({
          id: z.string().max(16),
          label: z.string().min(1).max(24),
        }),
      )
      .min(2)
      .max(4),
    holderId: z.string(),
    permissionLabel: z.string().min(1).max(30),
    lifetime: z.strictObject({
      value: z.number().int().min(1).max(8),
      unit: z.string().min(1).max(20),
    }),
    copy: z.strictObject({
      dock: z.string().min(1).max(32),
      held: z.string().min(1).max(32),
      expired: z.string().min(1).max(32),
      unassigned: z.string().min(1).max(32),
      example: z.string().min(1).max(32),
    }),
    showLifetime: z.boolean(),
    showLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const ids = input.participants.map(prop("id"));
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Participant IDs must be unique.",
      });
    }
    if (!ids.includes(input.holderId)) {
      context.addIssue({
        code: "custom",
        path: ["holderId"],
        message: "The holder must reference one participant.",
      });
    }
  }) satisfies z.ZodType;
/** Authored lease data inferred from its runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Structural constraints complement the holder reference rule. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** One matching unique participant determines initial exclusive possession. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-participants",
    paths: ["participants.*.id"],
    description:
      "Participant IDs must be unique, including an optional empty ID.",
  },
  {
    id: "holder-reference",
    paths: ["holderId", "participants.*.id"],
    description: "holderId references exactly one supplied participant.",
  },
];
