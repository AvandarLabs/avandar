import { prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      learner: z.string().min(0).max(26),
      companion: z.string().min(0).max(26),
    }),
    stops: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          kind: z.enum(["locker", "classroom"]),
          label: z.string().min(0).max(24),
          actionLabel: z.string().min(0).max(28),
        }),
      )
      .min(2)
      .max(2),
    finalStepSupport: z.enum(["alongside", "stands-back"]),
    showPracticeStrip: z.boolean(),
    labels: z.strictObject({
      setting: z.string().min(0).max(34),
      practice: z.string().min(0).max(34),
      choice: z.string().min(0).max(34),
      example: z.string().min(0).max(34),
    }),
    showFootprints: z.boolean(),
  })
  .refine(
    (input) => new Set(input.stops.map(prop("id"))).size === input.stops.length,
    { path: ["stops"], message: "Stop IDs must be unique." },
  )
  .refine(
    (input) =>
      input.stops[0]?.kind === "locker" && input.stops[1]?.kind === "classroom",
    { path: ["stops"], message: "Stops must be locker then classroom." },
  ) satisfies z.ZodType;
/** Schema-inferred scene input. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime and authoring relationships beyond structural JSON Schema. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "ordered-stops",
    paths: ["stops.*.kind"],
    description: "Exactly two stops are ordered locker then classroom.",
  },
  {
    id: "unique-stops",
    paths: ["stops.*.id"],
    description: "Stop IDs are distinct, including at most one empty ID.",
  },
  {
    id: "authored-choice",
    paths: ["labels.choice", "finalStepSupport"],
    description:
      "The author must supply choice prose consistent with the selected support. Natural-language meaning is not runtime-validated.",
  },
];
