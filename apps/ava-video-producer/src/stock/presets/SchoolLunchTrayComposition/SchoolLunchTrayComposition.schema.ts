import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with strict structural bounds. */
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
      .max(6),
    plannedComponents: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(20),
          symbol: z.enum(["grain", "beans", "fruit", "vegetables", "cup"]),
        }),
      )
      .min(2)
      .max(4),
    trays: z
      .array(
        z.strictObject({
          learnerId: z.string().min(1).max(20),
          componentIds: z.array(z.string().min(1).max(20)).min(0).max(4),
        }),
      )
      .min(2)
      .max(6),
    labels: z.strictObject({
      plan: z.string().min(1).max(26),
      matchesPlan: z.string().min(1).max(26),
      plannedTrays: z.string().min(1).max(26),
      missing: z.string().min(1).max(26),
    }),
    showComponentNames: z.boolean(),
    emphasizeMissingComponents: z.boolean(),
    caption: z.string().min(1).max(56),
  })
  .superRefine((input, context) => {
    const learnerIds = input.learners.map(prop("id"));
    const componentIds = input.plannedComponents.map(prop("id"));
    const trayIds = input.trays.map(prop("learnerId"));
    if (
      new Set(learnerIds).size !== learnerIds.length ||
      new Set(componentIds).size !== componentIds.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["learners"],
        message: "Learner and component IDs must each be unique.",
      });
    }
    if (
      trayIds.length !== learnerIds.length ||
      new Set(trayIds).size !== trayIds.length ||
      trayIds.some((id) => !learnerIds.includes(id))
    ) {
      context.addIssue({
        code: "custom",
        path: ["trays"],
        message: "Exactly one tray is required per learner.",
      });
    }
    input.trays.forEach((tray, index) => {
      if (
        new Set(tray.componentIds).size !== tray.componentIds.length ||
        tray.componentIds.some((id) => !componentIds.includes(id))
      ) {
        context.addIssue({
          code: "custom",
          path: ["trays", index, "componentIds"],
          message: "Served components must be a unique subset of the plan.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Authored input inferred from the runtime schema. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime cross-field rules in the complete export. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "1",
    paths: ["learners.*.id", "plannedComponents.*.id"],
    description:
      "Learner IDs and planned component IDs are unique within their collections.",
  },
  {
    id: "2",
    paths: ["trays.*.learnerId", "learners.*.id"],
    description:
      "Exactly one tray per learner ID, with no unknown or duplicate learner references.",
  },
  {
    id: "3",
    paths: ["trays.*.componentIds", "plannedComponents.*.id"],
    description:
      "Each served list is a unique subset of planned component IDs, including the empty subset.",
  },
];
