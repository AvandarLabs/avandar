import { prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      participant: z.string().min(0).max(24),
      worker: z.string().min(0).max(24),
      interpreter: z.string().min(0).max(24),
    }),
    languages: z.strictObject({
      participant: z.string().min(0).max(22),
      worker: z.string().min(0).max(22),
    }),
    turns: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          speaker: z.enum(["participant", "worker"]),
          originalText: z.string().min(0).max(48),
          interpretedText: z.string().min(0).max(48),
        }),
      )
      .min(2)
      .max(2),
    labels: z.strictObject({
      original: z.string().min(0).max(38),
      interpreted: z.string().min(0).max(38),
      example: z.string().min(0).max(38),
    }),
    showSightlines: z.boolean(),
    bubbleLayout: z.enum(["paired", "stacked"]),
  })
  .refine(
    (input) => new Set(input.turns.map(prop("id"))).size === input.turns.length,
    { path: ["turns"], message: "Turn IDs must be unique." },
  )
  .refine(
    (input) =>
      input.turns[0]?.speaker === "participant" &&
      input.turns[1]?.speaker === "worker",
    { path: ["turns"], message: "Turns must be participant then worker." },
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
    id: "ordered-turns",
    paths: ["turns.*.speaker"],
    description: "Exactly two turns are ordered participant then worker.",
  },
  {
    id: "unique-turns",
    paths: ["turns.*.id"],
    description: "Turn IDs are unique, including at most one empty ID.",
  },
  {
    id: "authored-interpretation",
    paths: ["turns.*.originalText", "turns.*.interpretedText", "languages"],
    description:
      "Both wordings are authored and attributed to the original speaker. Authors verify translations. No translation is generated. The interpreter is a distinct role even when labels coincide.",
  },
];
