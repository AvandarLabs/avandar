import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with strict structural bounds. */
export const inputSchema = z
  .strictObject({
    learners: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(16),
          movementIcon: z.enum(["walking", "wheeled"]),
        }),
      )
      .min(2)
      .max(6),
    adaptations: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(28),
          kind: z.enum(["clear-approach", "shared-table", "large-print-board"]),
        }),
      )
      .min(1)
      .max(3),
    activity: z.strictObject({
      label: z.string().min(1).max(28),
      boardText: z.string().min(1).max(36),
    }),
    resolvedLayout: z.enum(["shared-circle", "open-horseshoe"]),
    showApproachTrace: z.boolean(),
    phaseLabels: z.strictObject({
      before: z.string().min(1).max(28),
      after: z.string().min(1).max(28),
    }),
    caption: z.string().min(1).max(56),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.learners.map(prop("id"))).size !== input.learners.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["learners"],
        message: "Learner IDs must be unique.",
      });
    }
    if (
      new Set(input.adaptations.map(prop("id"))).size !==
        input.adaptations.length ||
      new Set(input.adaptations.map(prop("kind"))).size !==
        input.adaptations.length ||
      !input.adaptations.some(({ kind }) => kind === "clear-approach")
    ) {
      context.addIssue({
        code: "custom",
        path: ["adaptations"],
        message:
          "Adaptation IDs and kinds must be unique and include clear-approach.",
      });
    }
  }) satisfies z.ZodType;
/** Authored input inferred from the runtime schema. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime cross-field rules in the complete export. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  { id: "1", paths: ["learners.*.id"], description: "Learner IDs are unique." },
  {
    id: "2",
    paths: ["adaptations.*.id", "adaptations.*.kind"],
    description:
      "Adaptation IDs and kinds are each unique. The clear-approach kind is required for the crowded opening.",
  },
];
