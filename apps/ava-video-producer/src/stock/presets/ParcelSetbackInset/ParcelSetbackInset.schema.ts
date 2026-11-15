import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

const coordinate: z.ZodNumber = z.number().min(0).max(100);
/** Strict rectangular parcel, clearance and full footprint contract. */
export const inputSchema = z
  .strictObject({
    parcels: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().max(20),
          x: coordinate,
          y: coordinate,
          width: z.number().min(5).max(80),
          height: z.number().min(5).max(80),
        }),
      )
      .min(1)
      .max(3),
    setback: z.number().min(0).max(15),
    structure: z.strictObject({
      label: z.string().max(28),
      width: z.number().min(2).max(50),
      height: z.number().min(2).max(50),
    }),
    placement: z.strictObject({
      parcelId: z.string().max(12),
      centerX: coordinate,
      centerY: coordinate,
    }),
    copy: z.strictObject({
      context: z.string().max(40),
      parcel: z.string().max(40),
      envelope: z.string().max(40),
      clearance: z.string().max(40),
      empty: z.string().max(40),
      unit: z.string().max(40),
    }),
    showDimensions: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.parcels.map(prop("id"))).size !== input.parcels.length) {
      context.addIssue({
        code: "custom",
        path: ["parcels"],
        message: "Parcel IDs must be unique.",
      });
    }
    input.parcels.forEach((parcel, index) => {
      if (parcel.x + parcel.width > 100 || parcel.y + parcel.height > 100) {
        context.addIssue({
          code: "custom",
          path: ["parcels", index],
          message: "Entire rectangle must lie within 0..100.",
        });
      }
      if (
        input.parcels
          .slice(index + 1)
          .some(
            (other) =>
              parcel.x < other.x + other.width &&
              other.x < parcel.x + parcel.width &&
              parcel.y < other.y + other.height &&
              other.y < parcel.y + parcel.height,
          )
      ) {
        context.addIssue({
          code: "custom",
          path: ["parcels", index],
          message: "Parcel interiors must not overlap.",
        });
      }
    });
    const parcel = input.parcels.find(propEq("id", input.placement.parcelId));
    const { centerX, centerY } = input.placement;
    const { width, height } = input.structure;
    if (
      !parcel ||
      centerX - width / 2 < parcel.x + input.setback ||
      centerY - height / 2 < parcel.y + input.setback ||
      centerX + width / 2 > parcel.x + parcel.width - input.setback ||
      centerY + height / 2 > parcel.y + parcel.height - input.setback
    ) {
      context.addIssue({
        code: "custom",
        path: ["placement"],
        message: "Full structure footprint must fit the chosen inset envelope.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Cross-field geometry and clearance rules. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-parcels",
    paths: ["parcels.*.id"],
    description: "Parcel IDs are unique, including at most one empty ID.",
  },
  {
    id: "rectangular-frame",
    paths: ["parcels"],
    description:
      "Rectangles are fully inside 0..100 and have non-overlapping interiors; boundary contact is allowed.",
  },
  {
    id: "whole-footprint",
    paths: ["placement", "structure", "setback", "parcels"],
    description:
      "placement.parcelId exists. Both footprint dimensions must fit entirely within the chosen parcel inset by setback on every side. Exact fits are allowed. Unchosen exhausted envelopes have zero width and/or height, never negative dimensions.",
  },
];
