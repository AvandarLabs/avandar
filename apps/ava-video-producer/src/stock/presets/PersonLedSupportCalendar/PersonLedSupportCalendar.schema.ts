import { prop, propEq } from "@avandar/utils";
import { z } from "zod";
/** Strict authored input structure. */
const structure = z.strictObject({
  people: z.strictObject({
    participant: z.string().min(1).max(24),
    worker: z.string().min(1).max(24),
  }),
  days: z
    .array(
      z.strictObject({ id: z.string().max(16), label: z.string().max(20) }),
    )
    .min(2)
    .max(4),
  timeBands: z
    .array(
      z.strictObject({ id: z.string().max(16), label: z.string().max(16) }),
    )
    .min(2)
    .max(3),
  commitments: z
    .array(
      z.strictObject({
        id: z.string().max(16),
        label: z.string().max(22),
        kind: z.union([z.literal("existing"), z.literal("support")]),
        initialDayId: z.string().max(16),
        initialBandId: z.string().max(16),
        agreedDayId: z.string().max(16),
        agreedBandId: z.string().max(16),
      }),
    )
    .min(2)
    .max(5),
  copy: z.strictObject({
    goal: z.string().max(36),
    agreement: z.string().max(30),
    example: z.string().max(30),
  }),
  showOriginalAppointment: z.boolean(),
}) satisfies z.ZodType;

type SchemaInput = z.infer<typeof structure>;
function _sameCell({
  first,
  second,
}: {
  first: SchemaInput["commitments"][number];
  second: SchemaInput["commitments"][number];
}): boolean {
  return (
    first.initialDayId === second.initialDayId &&
    first.initialBandId === second.initialBandId
  );
}
function _validCommitments(input: SchemaInput): boolean {
  const support = input.commitments.filter(propEq("kind", "support"));
  const existing = input.commitments.filter(propEq("kind", "existing"));
  return (
    support.length === 1 &&
    existing.every(
      (item) =>
        item.initialDayId === item.agreedDayId &&
        item.initialBandId === item.agreedBandId,
    ) &&
    existing.some((item) => _sameCell({ first: item, second: support[0] })) &&
    (support[0].initialDayId !== support[0].agreedDayId ||
      support[0].initialBandId !== support[0].agreedBandId) &&
    new Set(
      input.commitments.map((item) =>
        JSON.stringify([item.agreedDayId, item.agreedBandId]),
      ),
    ).size === input.commitments.length
  );
}
/** Strict negotiated move with unchanged existing commitments. */
export const inputSchema = structure
  .refine(
    (input) =>
      [input.days, input.timeBands, input.commitments].every(
        (items) => new Set(items.map(prop("id"))).size === items.length,
      ),
    "Day, band and commitment IDs must be unique.",
  )
  .refine(
    (input) =>
      input.commitments.every(
        (item) =>
          [item.initialDayId, item.agreedDayId].every((id) =>
            input.days.some(propEq("id", id)),
          ) &&
          [item.initialBandId, item.agreedBandId].every((id) =>
            input.timeBands.some(propEq("id", id)),
          ),
      ),
    "All day and time-band references must exist.",
  )
  .refine(
    _validCommitments,
    "Exactly one support appointment must move from an existing conflict to an unoccupied final cell. Existing commitments stay fixed; final cells cannot overlap.",
  ) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime-only semantic constraints. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "identities",
    paths: ["days.*.id", "timeBands.*.id", "commitments.*.id"],
    description:
      "IDs are unique within each collection, permitting one empty ID in each.",
  },
  {
    id: "references",
    paths: ["commitments", "days", "timeBands"],
    description: "Every initial/agreed day and band references an existing ID.",
  },
  {
    id: "negotiated-move",
    paths: ["commitments"],
    description:
      "Exactly one support item initially overlaps an existing commitment and moves to a different agreed cell. Existing items retain initial positions. All final cells are distinct; the ghost is never an additional booking.",
  },
];
