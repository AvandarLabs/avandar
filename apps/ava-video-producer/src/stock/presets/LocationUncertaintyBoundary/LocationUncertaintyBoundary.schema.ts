import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
/** Strict authored input structure. */
const structure = z.strictObject({
  districts: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(24),
        polygon: z
          .array(
            z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
          )
          .min(3)
          .max(8),
      }),
    )
    .min(2)
    .max(4),
  locations: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(20),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        radius: z.number().min(0).max(15),
      }),
    )
    .min(2)
    .max(6),
  focusedLocationId: z.string().max(12),
  copy: z.strictObject({
    context: z.string().max(40),
    nominal: z.string().max(40),
    possible: z.string().max(40),
    definite: z.string().max(40),
    unresolved: z.string().max(40),
    total: z.string().max(40),
    unit: z.string().max(40),
  }),
  showOtherFootprints: z.boolean(),
}) satisfies z.ZodType;

type SchemaInput = z.infer<typeof structure>;
function _validDistricts(input: SchemaInput): boolean {
  return input.districts.every(
    (district, index) =>
      PlanarPolygon.isSimple({ polygon: district.polygon }) &&
      input.districts.slice(index + 1).every(
        (other) =>
          PlanarPolygon.isSimple({ polygon: other.polygon }) &&
          !PlanarPolygon.doInteriorsOverlap({
            firstPolygon: district.polygon,
            secondPolygon: other.polygon,
          }),
      ),
  );
}
/** Strict simple disjoint districts and bounded uncertainty disks. */
export const inputSchema = structure
  .refine(
    (input) =>
      new Set(input.districts.map(prop("id"))).size ===
        input.districts.length &&
      new Set(input.locations.map(prop("id"))).size === input.locations.length,
    "District and location IDs must be unique.",
  )
  .refine(
    _validDistricts,
    "Districts must be simple polygons with disjoint interiors.",
  )
  .refine(
    (input) => input.locations.some(propEq("id", input.focusedLocationId)),
    "The focused location must exist.",
  )
  .refine(
    (input) =>
      input.locations.every(
        (item) =>
          item.radius <= item.x &&
          item.radius <= item.y &&
          item.radius <= 100 - item.x &&
          item.radius <= 100 - item.y,
      ),
    "Entire footprints must fit inside the map extent.",
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
    paths: ["districts.*.id", "locations.*.id"],
    description:
      "District and location IDs are unique within each collection, allowing one empty ID.",
  },
  {
    id: "district-geometry",
    paths: ["districts.*.polygon"],
    description:
      "Districts are finite simple open rings with no repeated vertices, nonadjacent touch, self-crossing or backtracking. Interiors are disjoint; shared edges are allowed.",
  },
  {
    id: "focused-record",
    paths: ["focusedLocationId", "locations"],
    description: "The focused ID must reference an existing location.",
  },
  {
    id: "extent",
    paths: ["locations"],
    description:
      "Every entire disk lies inside the map extent: radius <= x, y, 100-x and 100-y.",
  },
  {
    id: "strict-containment",
    paths: ["locations", "districts", "showOtherFootprints"],
    description:
      "Assignment is definite only when the entire closed disk is strictly inside one district. Touching, crossing and outside disks are unresolved, including zero-radius boundary pins. Definite + unresolved equals all locations regardless of display toggle.",
  },
];
