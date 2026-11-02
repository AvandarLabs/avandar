import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input and runtime cross-field constraints. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      learner: z.string().min(1).max(20),
      teacher: z.string().min(1).max(20),
    }),
    periodLabels: z.strictObject({
      before: z.string().min(1).max(24),
      interruption: z.string().min(1).max(24),
      return: z.string().min(1).max(24),
    }),
    priorWork: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(24),
          form: z.enum(["drawing", "writing", "number-work"]),
        }),
      )
      .min(1)
      .max(3),
    returnActivities: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(28),
          kind: z.enum(["review", "new"]),
          priorWorkId: z.string().min(0).max(20),
        }),
      )
      .min(1)
      .max(3),
    activityLabels: z.strictObject({
      retained: z.string().min(1).max(24),
      review: z.string().min(1).max(24),
      new: z.string().min(1).max(24),
    }),
    showPortfolioTrail: z.boolean(),
    caption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    [input.priorWork, input.returnActivities].forEach((items, index) => {
      if (
        new Set(items.map(prop<{ id: string }, "id", string>("id"))).size !==
        items.length
      ) {
        context.addIssue({
          code: "custom",
          path: [index === 0 ? "priorWork" : "returnActivities"],
          message: "Collection IDs must be unique.",
        });
      }
    });
    input.returnActivities.forEach((activity, index) => {
      if (
        activity.kind === "review"
          ? !input.priorWork.some(propEq("id", activity.priorWorkId))
          : activity.priorWorkId !== ""
      ) {
        context.addIssue({
          code: "custom",
          path: ["returnActivities", index, "priorWorkId"],
          message:
            "Reviews reference existing work. New activities have an empty reference.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "returning-learner-worktable.0",
    paths: ["priorWork.*.id", "returnActivities.*.id"],
    description: "IDs are unique within each collection.",
  },
  {
    id: "returning-learner-worktable.1",
    paths: [
      "returnActivities.*.kind",
      "returnActivities.*.priorWorkId",
      "priorWork.*.id",
    ],
    description:
      "Every review references an existing prior work ID. Multiple reviews may reference the same work. Every new activity uses an empty priorWorkId.",
  },
  {
    id: "returning-learner-worktable.2",
    paths: ["priorWork", "returnActivities", "showPortfolioTrail"],
    description:
      "Original work identity and marks survive interruption and return. New activities do not replace earlier work or imply measured attainment. Hiding the trail does not duplicate or delete people or work.",
  },
];
