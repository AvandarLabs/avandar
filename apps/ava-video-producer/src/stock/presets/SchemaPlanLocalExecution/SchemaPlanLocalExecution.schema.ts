import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Local rows and supplied schema/question form separate boundary payloads. */
export const inputSchema = z
  .strictObject({
    columns: z.strictObject({
      category: z.string().min(1).max(20),
      measure: z.string().min(1).max(20),
    }),
    rows: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(12),
          category: z.string().min(1).max(16),
          value: z.number().min(0).max(100),
        }),
      )
      .min(2)
      .max(6),
    request: z.strictObject({
      question: z.string().min(1).max(52),
      selectedCategory: z.string().min(1).max(16),
      planLabel: z.string().min(1).max(38),
    }),
    boundaryLabels: z.strictObject({
      local: z.string().min(1).max(30),
      remote: z.string().min(1).max(30),
      outbound: z.string().min(1).max(30),
      inbound: z.string().min(1).max(30),
      result: z.string().min(1).max(30),
    }),
    showRows: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(38),
      before: z.string().min(1).max(38),
      after: z.string().min(1).max(38),
    }),
  })
  .superRefine((input, context) => {
    if (input.columns.category === input.columns.measure) {
      context.addIssue({
        code: "custom",
        path: ["columns"],
        message: "Column labels must differ.",
      });
    }
    if (new Set(input.rows.map(prop("id"))).size !== input.rows.length) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Row IDs must be unique.",
      });
    }
    if (
      !input.rows.some(
        ({ category }) => category === input.request.selectedCategory,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["request", "selectedCategory"],
        message: "Selected category must occur in local rows.",
      });
    }
    if (!input.request.question.includes(input.request.selectedCategory)) {
      context.addIssue({
        code: "custom",
        path: ["request", "question"],
        message: "Question must include the supplied selected category.",
      });
    }
  }) satisfies z.ZodType;
/** Authored output type. */
export type Input = z.output<typeof inputSchema>;
/** Structural bounds for data-only editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime references and exact supplied category disclosure. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "distinct-columns",
    paths: ["columns.category", "columns.measure"],
    description: "Schema column labels differ.",
  },
  {
    id: "unique-rows",
    paths: ["rows.*.id"],
    description: "The 2..6 row IDs are unique, and finite measures are 0..100.",
  },
  {
    id: "selected-category",
    paths: ["request.selectedCategory", "rows.*.category"],
    description:
      "Selected category occurs exactly as a category in at least one local row.",
  },
  {
    id: "explicit-question",
    paths: ["request.question", "request.selectedCategory"],
    description:
      "The supplied question contains the exact selected category. Only equality filtering and sum are supported; prose meaning and metadata disclosure are author responsibilities.",
  },
];
