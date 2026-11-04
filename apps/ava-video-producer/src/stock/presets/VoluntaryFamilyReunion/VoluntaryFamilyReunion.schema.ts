import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and cross-field validation. */
export const inputSchema = z
  .strictObject({
    groups: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(28),
          members: z
            .array(
              z.strictObject({
                id: z.string().min(0).max(24),
                label: z.string().min(0).max(20),
              }),
            )
            .min(1)
            .max(3),
        }),
      )
      .min(2)
      .max(2),
    meetingLabel: z.string().min(1).max(36),
    invitationLabels: z.strictObject({
      heading: z.string().min(0).max(26),
      acceptance: z.string().min(0).max(26),
    }),
    greeting: z.enum(["wave", "open-arms"]),
    showMemberLabels: z.boolean(),
    scenarioCaption: z.string().min(1).max(54),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (new Set(input.groups.map(prop("id"))).size !== input.groups.length) {
      issue("groups", "Group IDs must be unique.");
    }
    const allMembers = input.groups.flatMap(prop("members"));
    if (new Set(allMembers.map(prop("id"))).size !== allMembers.length) {
      issue("groups", "Member IDs must be globally unique.");
    }
  }) satisfies z.ZodType;
/** Input inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "voluntary-family-reunion.0",
    paths: ["groups.*.id", "groups.*.members.*.id"],
    description:
      "Exactly two groups have unique group IDs and 1..3 members each. Member IDs are globally unique. Each unique ID set permits at most one empty ID.",
  },
  {
    id: "voluntary-family-reunion.1",
    paths: ["invitationLabels.acceptance", "meetingLabel", "scenarioCaption"],
    description:
      "Author validates voluntary agreement, fictional names and schematic setting. Group agreement is an authored cue, never inferred identity or safeguarding evidence. Both acceptance marks precede travel.",
  },
];
