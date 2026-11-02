import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and cross-field validation. */
export const inputSchema = z
  .strictObject({
    services: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(26),
          symbol: z.enum(["shelter", "information", "water"]),
        }),
      )
      .min(2)
      .max(3),
    chosenServiceId: z.string().min(0).max(24),
    accessChange: z.enum(["unfold-ramp", "clear-entrance"]),
    participantMobility: z.enum(["walking", "wheelchair"]),
    labels: z.strictObject({
      participant: z.string().min(0).max(24),
      staff: z.string().min(0).max(24),
      choice: z.string().min(0).max(24),
    }),
    showChoiceLabel: z.boolean(),
    scenarioCaption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (
      new Set(input.services.map(prop("id"))).size !== input.services.length
    ) {
      issue("services", "Service IDs must be unique.");
    }
    if (!input.services.some(({ id }) => id === input.chosenServiceId)) {
      issue(
        "chosenServiceId",
        "Chosen service must exist, including an authored empty ID.",
      );
    }
  }) satisfies z.ZodType;
/** Input inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "chosen-service-access.0",
    paths: ["services.*.id", "chosenServiceId"],
    description:
      "Service IDs are unique and chosenServiceId matches exactly one service, including a unique empty ID. Only this entrance changes; all other entrances retain their barrier.",
  },
  {
    id: "chosen-service-access.1",
    paths: ["scenarioCaption"],
    description:
      "Author validates fictional scenario wording. Service symbols exclude medical services.",
  },
];
