import { prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    people: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(24),
          role: z.enum(["participant", "worker", "supporter"]),
        }),
      )
      .min(3)
      .max(3),
    requestLabel: z.string().min(1).max(40),
    roomLabels: z.strictObject({
      meeting: z.string().min(0).max(26),
      waiting: z.string().min(0).max(26),
    }),
    partition: z.enum(["door", "screen"]),
    showWaitingSupporter: z.boolean(),
    copy: z.strictObject({
      acknowledgement: z.string().min(0).max(38),
      hold: z.string().min(0).max(38),
      example: z.string().min(0).max(38),
    }),
  })
  .refine(
    (input) =>
      new Set(input.people.map(prop("id"))).size === input.people.length,
    { path: ["people"], message: "Person IDs must be unique." },
  )
  .refine((input) => new Set(input.people.map(prop("role"))).size === 3, {
    path: ["people"],
    message: "One person per role is required.",
  }) satisfies z.ZodType;
/** Schema-inferred scene input. */
export type Input = z.infer<typeof inputSchema>;

/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "unique-people",
    paths: ["people.*.id"],
    description:
      "The three person IDs are unique, including at most one empty ID.",
  },
  {
    id: "distinct-roles",
    paths: ["people.*.role"],
    description:
      "Exactly one participant, one worker and one supporter are required.",
  },
];
