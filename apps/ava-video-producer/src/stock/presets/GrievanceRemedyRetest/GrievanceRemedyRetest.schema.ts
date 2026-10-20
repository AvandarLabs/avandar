import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      participant: z.string().min(0).max(26),
      worker: z.string().min(0).max(26),
    }),
    object: z.strictObject({
      kind: z.enum(["locker-latch", "desk-lamp"]),
      label: z.string().min(0).max(24),
    }),
    testResults: z.strictObject({
      before: z.enum(["not-functioning"]),
      after: z.enum(["functioning", "not-functioning", "not-tested"]),
    }),
    participantResponse: z.enum(["accepted", "not-accepted", "pending"]),
    labels: z.strictObject({
      issue: z.string().min(0).max(34),
      repair: z.string().min(0).max(34),
      test: z.string().min(0).max(34),
      accepted: z.string().min(0).max(34),
      notAccepted: z.string().min(0).max(34),
      pending: z.string().min(0).max(34),
      example: z.string().min(0).max(34),
    }),
    showComplaintMarker: z.boolean(),
  })
  .refine(
    (input) =>
      input.participantResponse !== "accepted" ||
      input.testResults.after === "functioning",
    {
      path: ["participantResponse"],
      message: "Acceptance requires a functioning retest.",
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
    id: "acceptance-requires-functioning",
    paths: ["participantResponse", "testResults.after"],
    description:
      "accepted requires functioning. Functioning may still be not-accepted or pending. not-tested prevents a second operation.",
  },
  {
    id: "authored-object-copy",
    paths: ["object.kind", "labels.issue", "labels.repair"],
    description:
      "The author must supply issue and repair copy matching the selected object. This editorial constraint cannot be inferred from arbitrary text.",
  },
];
