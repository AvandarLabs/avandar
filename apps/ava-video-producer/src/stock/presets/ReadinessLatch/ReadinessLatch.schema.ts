import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict required branches retain authored readiness and relative work. */
export const inputSchema = z
  .strictObject({
    participants: z
      .array(
        z.strictObject({
          id: z.string().max(16),
          label: z.string().min(1).max(24),
          ready: z.boolean(),
          workUnits: z.number().int().min(1).max(5),
        }),
      )
      .min(2)
      .max(5),
    sharedAction: z.string().min(1).max(32),
    copy: z.strictObject({
      ready: z.string().min(1).max(30),
      waiting: z.string().min(1).max(30),
      held: z.string().min(1).max(30),
      released: z.string().min(1).max(30),
      example: z.string().min(1).max(30),
    }),
    orientation: z.enum(["horizontal", "vertical"]),
    showParticipantStates: z.boolean(),
    showLabels: z.boolean(),
    showWorkValues: z.boolean(),
    unitLabel: z.string().min(1).max(16),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.participants.map(prop("id"))).size !==
      input.participants.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Participant IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Authored readiness input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Structural constraints preserve every accepted text bound. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime uniqueness is independent from readiness values. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-participants",
    paths: ["participants.*.id"],
    description:
      "Every participant ID is unique, including an optional empty ID.",
  },
];
