import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    projects: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(26),
          symbol: z.enum(["bench", "books", "garden"]),
        }),
      )
      .min(2)
      .max(3),
    ballots: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          projectId: z.string().max(16).nullable(),
        }),
      )
      .min(2)
      .max(8),
    labels: z.strictObject({
      choices: z.string().min(0).max(32),
      box: z.string().min(0).max(32),
      tally: z.string().min(0).max(32),
      abstained: z.string().min(0).max(32),
      unit: z.string().min(0).max(32),
      example: z.string().min(0).max(32),
    }),
    showTotals: z.boolean(),
    tallyArrangement: z.enum(["stacks", "rows"]),
    closingNote: z.string().min(1).max(46),
  })
  .refine(
    (input) =>
      [input.projects, input.ballots].every(
        (items) =>
          new Set(items.map(prop<{ id: string }, "id", string>("id"))).size ===
          items.length,
      ),
    { message: "IDs must be unique within each collection." },
  )
  .refine(
    (input) =>
      input.ballots.every(
        (ballot) =>
          ballot.projectId === null ||
          input.projects.some(
            propEq<{ id: unknown }, "id", unknown>("id", ballot.projectId),
          ),
      ),
    {
      path: ["ballots"],
      message: "Every non-null project reference must exist.",
    },
  ) satisfies z.ZodType;
/** Schema-inferred scene input. */
export type Input = z.infer<typeof inputSchema>;

/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "unique-identities",
    paths: ["projects.*.id", "ballots.*.id"],
    description:
      "Project and ballot IDs are unique within their own collection, including at most one empty ID.",
  },
  {
    id: "project-references",
    paths: ["ballots.*.projectId", "projects.*.id"],
    description:
      "Every non-null projectId references an existing project. Empty string references an empty project ID, independently of null abstention.",
  },
  {
    id: "authored-closing-note",
    paths: ["closingNote"],
    description:
      "The author must not imply automatic funding in the closing note. This editorial constraint cannot be inferred from arbitrary text.",
  },
];
