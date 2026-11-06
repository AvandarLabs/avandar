import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input and runtime cross-field constraints. */
export const inputSchema = z
  .strictObject({
    staff: z.strictObject({
      teacher: z.strictObject({
        id: z.string().min(1).max(20),
        label: z.string().min(1).max(20),
      }),
      cover: z.strictObject({
        id: z.string().min(1).max(20),
        label: z.string().min(1).max(20),
      }),
      mentor: z.strictObject({
        id: z.string().min(1).max(20),
        label: z.string().min(1).max(20),
      }),
    }),
    learners: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(16),
        }),
      )
      .min(2)
      .max(6),
    session: z.strictObject({
      label: z.string().min(1).max(24),
      mode: z.enum(["rehearsal", "co-planning"]),
      prompt: z.string().min(1).max(40),
    }),
    roomLabels: z.strictObject({
      classroom: z.string().min(1).max(24),
      supportSpace: z.string().min(1).max(24),
    }),
    phaseLabels: z.strictObject({
      cover: z.string().min(1).max(24),
      support: z.string().min(1).max(24),
      return: z.string().min(1).max(24),
    }),
    showClassroomResponsibility: z.boolean(),
    caption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    if (new Set(Object.values(input.staff).map(prop("id"))).size !== 3) {
      context.addIssue({
        code: "custom",
        path: ["staff"],
        message: "The three staff roles require distinct IDs.",
      });
    }
    if (
      new Set(input.learners.map(prop("id"))).size !== input.learners.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["learners"],
        message: "Learner IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "teacher-learning-cover.0",
    paths: ["staff.teacher.id", "staff.cover.id", "staff.mentor.id"],
    description:
      "Exactly three distinct staff IDs. Roles never double as one adult in the same beat.",
  },
  {
    id: "teacher-learning-cover.1",
    paths: ["learners.*.id"],
    description: "Learner IDs are unique within the fixed 2..6 learner roster.",
  },
  {
    id: "teacher-learning-cover.2",
    paths: ["staff", "learners", "showClassroomResponsibility"],
    description:
      "Cover arrives before teacher departure and remains until teacher return. Adult positions, rather than only an optional bracket, establish responsibility. Staff are excluded from learner count.",
  },
];
