import { propEq, propNotEq, prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    machine: z.strictObject({
      kind: z.enum(["sewing-machine", "workbench"]),
      label: z.string().min(0).max(28),
    }),
    timeSlots: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(18),
        }),
      )
      .min(2)
      .max(5),
    requests: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          participant: z.string().min(0).max(24),
          requestedSlotId: z.string().min(0).max(16),
          agreedSlotId: z.string().max(16).nullable(),
        }),
      )
      .min(2)
      .max(3),
    labels: z.strictObject({
      requested: z.string().min(0).max(30),
      agreed: z.string().min(0).max(30),
      unresolved: z.string().min(0).max(30),
      example: z.string().min(0).max(30),
    }),
    showOriginalRequests: z.boolean(),
    showUsageTurns: z.boolean(),
  })
  .refine(
    (input) =>
      new Set(input.timeSlots.map(prop("id"))).size === input.timeSlots.length,
    { path: ["timeSlots"], message: "Slot IDs must be unique." },
  )
  .refine(
    (input) =>
      new Set(input.requests.map(prop("id"))).size === input.requests.length,
    { path: ["requests"], message: "Request IDs must be unique." },
  )
  .refine(
    (input) =>
      input.requests.every(
        (request) =>
          input.timeSlots.some(propEq("id", request.requestedSlotId)) &&
          (request.agreedSlotId === null ||
            input.timeSlots.some(
              propEq<{ id: unknown }, "id", unknown>(
                "id",
                request.agreedSlotId,
              ),
            )),
      ),
    { path: ["requests"], message: "Slot references must exist." },
  )
  .refine(
    (input) => {
      const bookings = input.requests
        .filter(propNotEq("agreedSlotId", null))
        .map(prop("agreedSlotId"));
      return new Set(bookings).size === bookings.length;
    },
    { path: ["requests"], message: "Agreed slots must be distinct." },
  )
  .refine(
    (input) =>
      new Set(input.requests.map(prop("requestedSlotId"))).size <
      input.requests.length,
    {
      path: ["requests"],
      message: "At least two requested slots must overlap.",
    },
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
    id: "unique-slots",
    paths: ["timeSlots.*.id"],
    description: "Slot IDs are unique, including at most one empty ID.",
  },
  {
    id: "unique-requests",
    paths: ["requests.*.id"],
    description: "Request IDs are unique, including at most one empty ID.",
  },
  {
    id: "existing-slots",
    paths: [
      "requests.*.requestedSlotId",
      "requests.*.agreedSlotId",
      "timeSlots.*.id",
    ],
    description:
      "Every requested and non-null agreed slot references an existing slot. An empty ID is distinct from null.",
  },
  {
    id: "distinct-bookings",
    paths: ["requests.*.agreedSlotId"],
    description:
      "Non-null agreed slots are unique. All agreed slots may be null.",
  },
  {
    id: "overlapping-requests",
    paths: ["requests.*.requestedSlotId"],
    description: "At least two requested slots overlap.",
  },
];
