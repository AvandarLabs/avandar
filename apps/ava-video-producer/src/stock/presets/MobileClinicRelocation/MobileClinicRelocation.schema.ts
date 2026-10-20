import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with bounded collections and semantic validation. */
export const inputSchema = z
  .strictObject({
    sites: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(22),
          x: z.number().finite().min(0.15).max(0.85),
          y: z.number().finite().min(0.15).max(0.85),
        }),
      )
      .min(2)
      .max(2),
    slots: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(14),
        }),
      )
      .min(1)
      .max(6),
    people: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(16),
          slotId: z.string().min(0).max(16).nullable(),
        }),
      )
      .min(1)
      .max(8),
    sceneLabel: z.string().min(1).max(40),
    showSlotLedger: z.boolean(),
    view: z.enum(["local-map", "globe-to-local"]),
    copy: z.strictObject({
      map: z.string().min(1).max(42),
      people: z.string().min(1).max(42),
      booked: z.string().min(1).max(42),
      unbooked: z.string().min(1).max(42),
      slots: z.string().min(1).max(42),
      open: z.string().min(1).max(42),
      clinic: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    [input.sites, input.slots, input.people].forEach((items) => {
      if (new Set(items.map(prop("id"))).size !== items.length) {
        context.addIssue({
          code: "custom",
          message: "Collection identities must be unique.",
        });
      }
    });
    if (
      input.sites.length === 2 &&
      Math.hypot(
        input.sites[0].x - input.sites[1].x,
        input.sites[0].y - input.sites[1].y,
      ) < 0.4
    ) {
      context.addIssue({
        code: "custom",
        message: "Sites need separation of at least 0.4.",
        path: ["sites"],
      });
    }
    const assigned = input.people.flatMap(({ slotId }) =>
      slotId === null ? [] : [slotId],
    );
    if (
      new Set(assigned).size !== assigned.length ||
      assigned.some((slotId) => !input.slots.some(({ id }) => id === slotId))
    ) {
      context.addIssue({
        code: "custom",
        message: "Each booking must reference a distinct supplied slot.",
        path: ["people"],
      });
    }
  }) satisfies z.ZodType;
/** Input is inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "mobile-clinic-relocation.0",
    paths: [
      "sites",
      "slots",
      "people",
      "sceneLabel",
      "showSlotLedger",
      "view",
      "copy",
    ],
    description:
      "The people denominator is people.length. Booked people equals the number of non-null slotId values, and booked + unbooked equals the people total.",
  },
  {
    id: "mobile-clinic-relocation.1",
    paths: [
      "sites",
      "slots",
      "people",
      "sceneLabel",
      "showSlotLedger",
      "view",
      "copy",
    ],
    description:
      "Slot capacity is slots.length. Occupied slots is the distinct assigned slotId count; occupied + open equals capacity. Each slot can have at most one assigned person, and no duplicated glyph creates extra capacity.",
  },
  {
    id: "mobile-clinic-relocation.2",
    paths: [
      "sites",
      "slots",
      "people",
      "sceneLabel",
      "showSlotLedger",
      "view",
      "copy",
    ],
    description:
      "All assignments are authored. This is not a routing optimizer, access-distance model, clinical prioritization rule, eligibility decision, or recommendation for service placement.",
  },
  {
    id: "mobile-clinic-relocation.3",
    paths: [
      "sites",
      "slots",
      "people",
      "sceneLabel",
      "showSlotLedger",
      "view",
      "copy",
    ],
    description:
      "Bookings are administrative plans, not attendance or treatment. The schematic map has no real geography, scale, journey time, distance measurement, or implied population coverage.",
  },
  {
    id: "mobile-clinic-relocation.collection-identities",
    paths: ["sites.*.id", "slots.*.id", "people.*.id"],
    description:
      "IDs must be unique within each collection of sites, slots and people. IDs may repeat across different collections, and empty strings remain valid IDs when unique.",
  },
  {
    id: "mobile-clinic-relocation.site-separation",
    paths: ["sites.*.x", "sites.*.y"],
    description:
      "The two site centers must have normalized Euclidean separation of at least 0.4.",
  },
  {
    id: "mobile-clinic-relocation.booking-references",
    paths: ["people.*.slotId", "slots.*.id"],
    description:
      "Every non-null person slotId must reference a supplied slot ID. An existing empty string is a booked slot reference, distinct from null, which means unbooked.",
  },
  {
    id: "mobile-clinic-relocation.booking-exclusivity",
    paths: ["people.*.slotId"],
    description:
      "At most one person may be assigned to each supplied slot. Non-null slotId values must be distinct; multiple null values are allowed.",
  },
];
