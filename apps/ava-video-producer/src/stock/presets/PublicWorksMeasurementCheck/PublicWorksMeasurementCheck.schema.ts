import { prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    structure: z.enum(["low-wall", "handrail"]),
    specification: z.strictObject({
      label: z.string().min(0).max(28),
      length: z.number().min(1).max(8),
      unit: z.string().min(0).max(18),
    }),
    observation: z.strictObject({
      label: z.string().min(0).max(30),
      length: z.number().min(1).max(8),
      sourceLabel: z.string().min(0).max(30),
    }),
    observers: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(24),
        }),
      )
      .min(2)
      .max(2),
    showDifference: z.boolean(),
    labels: z.strictObject({
      specification: z.string().min(0).max(32),
      observation: z.string().min(0).max(32),
      difference: z.string().min(0).max(32),
      example: z.string().min(0).max(32),
    }),
  })
  .refine(
    (input) =>
      new Set(input.observers.map(prop("id"))).size === input.observers.length,
    { path: ["observers"], message: "Observer IDs must be unique." },
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
    id: "unique-observers",
    paths: ["observers.*.id"],
    description:
      "Exactly two observers have distinct IDs, including at most one empty ID.",
  },
];
