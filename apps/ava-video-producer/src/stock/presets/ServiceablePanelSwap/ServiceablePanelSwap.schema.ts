import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** A fixed enclosure with one explicitly referenced replacement slot. */
export const inputSchema = z
  .strictObject({
    modules: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(22),
        }),
      )
      .min(2)
      .max(4),
    replacement: z.strictObject({
      targetModuleId: z.string().min(1).max(20),
      id: z.string().min(1).max(20),
      label: z.string().min(1).max(22),
    }),
    workerLabel: z.string().min(1).max(20),
    enclosure: z.enum(["console", "cabinet"]),
    labels: z.strictObject({
      whole: z.string().min(1).max(36),
      changed: z.string().min(1).max(36),
      retained: z.string().min(1).max(36),
      removed: z.string().min(1).max(36),
      example: z.string().min(1).max(36),
    }),
    showConnectorGuide: z.boolean(),
  })
  .superRefine((input, context) => {
    const ids = input.modules.map(prop("id"));
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["modules"],
        message: "Original IDs must be unique.",
      });
    }
    if (!ids.includes(input.replacement.targetModuleId)) {
      context.addIssue({
        code: "custom",
        path: ["replacement", "targetModuleId"],
        message: "Target must reference an original module.",
      });
    }
    if (ids.includes(input.replacement.id)) {
      context.addIssue({
        code: "custom",
        path: ["replacement", "id"],
        message: "Replacement ID must be new.",
      });
    }
  }) satisfies z.ZodType;
/** Authored output type. */
export type Input = z.output<typeof inputSchema>;
/** Structural bounds for data-only editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime identity and reference constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-modules",
    paths: ["modules.*.id"],
    description:
      "The 2..4 original module IDs are unique; array order fixes slot positions.",
  },
  {
    id: "existing-target",
    paths: ["replacement.targetModuleId", "modules.*.id"],
    description: "Replacement target references an existing original module.",
  },
  {
    id: "new-replacement",
    paths: ["replacement.id", "modules.*.id"],
    description:
      "Replacement ID differs from every original module ID. The removed original remains distinct.",
  },
];
