import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Exact byte boundaries and a bounded resumed transfer. */
export const inputSchema = z
  .strictObject({
    file: z.strictObject({
      label: z.string().min(1).max(28),
      sizeBytes: z.number().int().min(2).max(100000),
      chunkBytes: z.number().int().min(1).max(100000),
    }),
    acknowledgedBytes: z.number().int().min(0).max(99999),
    finalOutcome: z.enum(["completed", "still-pending"]),
    labels: z.strictObject({
      confirmed: z.string().min(1).max(24),
      retry: z.string().min(1).max(24),
      remaining: z.string().min(1).max(24),
      unit: z.string().min(1).max(24),
    }),
    showOffsets: z.boolean(),
  })
  .superRefine((input, context) => {
    const { sizeBytes, chunkBytes } = input.file;
    if (
      chunkBytes > sizeBytes ||
      Math.ceil(sizeBytes / chunkBytes) < 2 ||
      Math.ceil(sizeBytes / chunkBytes) > 6
    ) {
      context.addIssue({
        code: "custom",
        path: ["file", "chunkBytes"],
        message: "Chunk size must be within file size and yield 2..6 chunks.",
      });
    }
    if (
      input.acknowledgedBytes >= sizeBytes ||
      input.acknowledgedBytes % chunkBytes !== 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["acknowledgedBytes"],
        message: "Acknowledgment must be a chunk boundary before the file end.",
      });
    }
    if (
      input.finalOutcome === "still-pending" &&
      input.acknowledgedBytes + chunkBytes >= sizeBytes
    ) {
      context.addIssue({
        code: "custom",
        path: ["finalOutcome"],
        message: "One resumed chunk must leave a positive remaining suffix.",
      });
    }
  }) satisfies z.ZodType;
/** Inferred complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Full structural schema. Semantic constraints remain runtime validated. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Explicit runtime invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "chunk-count",
    paths: ["file.sizeBytes", "file.chunkBytes"],
    description:
      "chunkBytes is within 1..sizeBytes and ceil(sizeBytes/chunkBytes) is 2..6.",
  },
  {
    id: "acknowledged-boundary",
    paths: ["acknowledgedBytes", "file.sizeBytes", "file.chunkBytes"],
    description:
      "The integer acknowledgedBytes is >=0, strictly less than sizeBytes, and divisible by chunkBytes.",
  },
  {
    id: "pending-remainder",
    paths: [
      "finalOutcome",
      "acknowledgedBytes",
      "file.chunkBytes",
      "file.sizeBytes",
    ],
    description:
      "Still-pending stops after exactly one resumed chunk and requires acknowledgedBytes + chunkBytes < sizeBytes. Confirmed and remaining always partition sizeBytes. The final chunk contains exact remaining bytes.",
  },
];
