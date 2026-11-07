/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";
import type { Enums } from "$/types/database.types.ts";

/**
 * Kinds of gadget, in the order the `@` menu groups them. Use it wherever
 * gadget types are listed or validated, for example grouping search results
 * or checking a stored gadget node.
 */
export const GADGET_TYPES = [
  "dashboard",
  "dashboard_tile",
  "dataset",
  "map",
  "concept",
  "individual",
] as const satisfies ReadonlyArray<Enums<"gadget_type">>;

type GadgetType = (typeof GADGET_TYPES)[number];

/**
 * A pointer to one gadget. For a dashboard tile, `gadgetId` is the
 * dashboard's id and `subId` is the tile's block id; every other type has
 * no `subId`.
 */
type GadgetRef = {
  gadgetType: GadgetType;
  gadgetId: string;
  subId: string | null;
};

/**
 * Validates a gadget ref, such as the attributes of a stored gadget node or
 * a row returned by gadget search. `subId` is `null` rather than optional
 * because it round-trips through JSON and a nullable column. Extra fields
 * are rejected, so a stored ref can never carry the gadget's name.
 */
export const GadgetRefSchema: z.ZodType<GadgetRef> = z
  .strictObject({
    gadgetType: z.enum(GADGET_TYPES),
    gadgetId: z.uuid(),
    subId: z.string().min(1).nullable(),
  })
  .refine(
    (ref) => {
      return (ref.gadgetType === "dashboard_tile") === (ref.subId !== null);
    },
    { message: "Only a dashboard tile ref has a sub id" },
  );

/**
 * Whether a value is a valid gadget ref. Use it to drop malformed refs
 * before showing them, for example search rows that do not form a ref.
 */
export function isGadgetRef(value: unknown): value is GadgetRef {
  return GadgetRefSchema.safeParse(value).success;
}

/**
 * Anything a comment can reference: a dashboard, a dashboard tile, a
 * dataset, a map, a case type, or a case. See `docs/measles-demo/gadgets.md`.
 */
export namespace Gadget {
  export type Type = GadgetType;
  export type Ref = GadgetRef;
}
