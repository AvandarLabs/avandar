import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input and runtime cross-field constraints. */
export const inputSchema = z
  .strictObject({
    learners: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(16),
        }),
      )
      .min(2)
      .max(8),
    books: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(22),
          pageLabel: z.string().min(1).max(28),
        }),
      )
      .min(1)
      .max(4),
    readingGroups: z
      .array(
        z.strictObject({
          bookId: z.string().min(1).max(20),
          learnerIds: z.array(z.string().min(1).max(20)).min(1).max(4),
        }),
      )
      .min(1)
      .max(4),
    startingShelf: z.enum(["front", "side"]),
    labels: z.strictObject({
      books: z.string().min(1).max(26),
      readers: z.string().min(1).max(26),
      class: z.string().min(1).max(26),
    }),
    showGroupCounts: z.boolean(),
    caption: z.string().min(1).max(48),
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
      new Set(input.books.map(prop("id"))).size !== input.books.length ||
      input.books.length > input.learners.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["books"],
        message: "Books require unique IDs and cannot outnumber learners.",
      });
    }
    const bookIds = input.readingGroups.map(prop("bookId"));
    if (
      bookIds.length !== input.books.length ||
      new Set(bookIds).size !== bookIds.length ||
      bookIds.some((id) => !input.books.some(propEq("id", id)))
    ) {
      context.addIssue({
        code: "custom",
        path: ["readingGroups"],
        message: "Exactly one reading group must reference each existing book.",
      });
    }
    const learnerIds = input.readingGroups.flatMap(prop("learnerIds"));
    if (
      learnerIds.length !== input.learners.length ||
      new Set(learnerIds).size !== learnerIds.length ||
      learnerIds.some((id) => !input.learners.some(propEq("id", id)))
    ) {
      context.addIssue({
        code: "custom",
        path: ["readingGroups"],
        message: "Each known learner belongs to exactly one group.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "shared-reading-circles.0",
    paths: ["learners.*.id", "books.*.id"],
    description:
      "IDs are unique within each collection. Physical book count cannot exceed learner count.",
  },
  {
    id: "shared-reading-circles.1",
    paths: ["readingGroups.*.bookId", "books.*.id"],
    description:
      "Exactly one group references each existing book ID. Unknown or duplicate book references are invalid.",
  },
  {
    id: "shared-reading-circles.2",
    paths: ["readingGroups.*.learnerIds", "learners.*.id"],
    description:
      "Each group has 1..4 known learner IDs. Every learner occurs exactly once across all groups.",
  },
  {
    id: "shared-reading-circles.3",
    paths: ["books", "startingShelf", "showGroupCounts"],
    description:
      "Every physical copy appears once throughout shelf travel, opening and page turn. Counts derive from supplied arrays. Optional labels and shelf placement do not change inventory or membership.",
  },
];
