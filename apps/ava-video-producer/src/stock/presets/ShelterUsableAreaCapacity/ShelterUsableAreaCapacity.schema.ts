import { prop } from "@avandar/utils";
import { z } from "zod";
import { OrthogonalGrid } from "../../geometry/OrthogonalGrid/OrthogonalGrid";
/** Strict authored input structure. */
const structure = z.strictObject({
  floorTiles: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        column: z.number().int().min(0).max(3),
        row: z.number().int().min(0).max(2),
        role: z.union([
          z.literal("sleeping"),
          z.literal("circulation"),
          z.literal("storage"),
          z.literal("closed"),
        ]),
      }),
    )
    .min(4)
    .max(12),
  areaPerTile: z.number().min(1).max(20),
  illustrativeAreaPerPlace: z.number().min(0.5).max(20),
  registeredPeople: z.number().int().min(0).max(40),
  copy: z.strictObject({
    context: z.string().max(48),
    sleeping: z.string().max(48),
    circulation: z.string().max(48),
    storage: z.string().max(48),
    closed: z.string().max(48),
    gross: z.string().max(48),
    usable: z.string().max(48),
    benchmark: z.string().max(48),
    capacity: z.string().max(48),
    demand: z.string().max(48),
    shortfall: z.string().max(48),
    spare: z.string().max(48),
    areaUnit: z.string().max(48),
  }),
  keepGrossOutline: z.boolean(),
}) satisfies z.ZodType;

function _hasTwoDecimalPlaces(value: number): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(String(value));
}
/** Strict contiguous floor with exact authored hundredths. */
export const inputSchema = structure
  .refine(
    (input) =>
      new Set(input.floorTiles.map(prop("id"))).size ===
        input.floorTiles.length &&
      new Set(input.floorTiles.map((tile) => `${tile.column},${tile.row}`))
        .size === input.floorTiles.length &&
      OrthogonalGrid.areCellsConnected(input.floorTiles),
    "Floor IDs and positions are unique and the footprint is contiguous.",
  )
  .refine(
    (input) =>
      _hasTwoDecimalPlaces(input.areaPerTile) &&
      _hasTwoDecimalPlaces(input.illustrativeAreaPerPlace),
    "Areas permit at most two decimal places.",
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
    id: "floor-identity",
    paths: ["floorTiles"],
    description:
      "Tile IDs and grid positions are unique. Supplied tiles form one orthogonally contiguous footprint.",
  },
  {
    id: "decimal-precision",
    paths: ["areaPerTile", "illustrativeAreaPerPlace"],
    description:
      "Both area values have at most two decimal places in their authored decimal representation. No epsilon widens precision acceptance.",
  },
  {
    id: "capacity",
    paths: [
      "floorTiles",
      "areaPerTile",
      "illustrativeAreaPerPlace",
      "registeredPeople",
    ],
    description:
      "Only sleeping tiles contribute usable area. Role areas sum to gross area. Capacity is floor(sleeping count * exact area hundredths / exact divisor hundredths), floored once. Shortfall=max(people-capacity,0); spare=max(capacity-people,0).",
  },
];
