import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import { OrthogonalGrid } from "../../geometry/OrthogonalGrid/OrthogonalGrid";
/** Strict authored input structure. */
const structure = z.strictObject({
  cells: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(16),
        column: z.number().int().min(0).max(2),
        row: z.number().int().min(0).max(2),
        records: z.number().int().min(0).max(100),
        population: z.number().int().min(1).max(1000),
      }),
    )
    .min(4)
    .max(9),
  groupings: z
    .array(
      z.strictObject({
        label: z.string().max(24),
        zones: z
          .array(
            z.strictObject({
              id: z.string().max(12),
              label: z.string().max(24),
              cellIds: z.array(z.string().max(12)).min(1).max(9),
            }),
          )
          .min(2)
          .max(3),
      }),
    )
    .min(2)
    .max(2),
  measure: z.union([z.literal("count"), z.literal("normalized")]),
  rateBase: z.union([
    z.literal(1),
    z.literal(10),
    z.literal(100),
    z.literal(1000),
  ]),
  copy: z.strictObject({
    context: z.string().max(40),
    total: z.string().max(40),
    records: z.string().max(40),
    population: z.string().max(40),
    per: z.string().max(40),
  }),
  showCellValues: z.boolean(),
}) satisfies z.ZodType;

type SchemaInput = z.infer<typeof structure>;
function _validGrouping(input: SchemaInput): boolean {
  return input.groupings.every((grouping) => {
    const ids = grouping.zones.flatMap(prop("cellIds"));
    return (
      new Set(grouping.zones.map(prop("id"))).size === grouping.zones.length &&
      ids.length === input.cells.length &&
      new Set(ids).size === ids.length &&
      ids.every((id) => input.cells.some(propEq("id", id))) &&
      grouping.zones.every((zone) =>
        OrthogonalGrid.areCellsConnected(
          input.cells.filter((cell) => zone.cellIds.includes(cell.id)),
        ),
      )
    );
  });
}
/** Strict complete partitions of unchanged atomic cells. */
export const inputSchema = structure
  .refine(
    (input) =>
      new Set(input.cells.map(prop("id"))).size === input.cells.length &&
      new Set(input.cells.map((cell) => `${cell.column},${cell.row}`)).size ===
        input.cells.length &&
      input.cells.every((cell) => cell.records <= cell.population),
    "Cells require unique IDs/positions and records <= population.",
  )
  .refine(
    _validGrouping,
    "Each grouping must partition every cell exactly once into unique contiguous zones.",
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
    id: "unique-cells",
    paths: ["cells"],
    description:
      "Cell IDs and (column,row) positions are unique. Each integer records count is <= its positive population.",
  },
  {
    id: "partitions",
    paths: ["cells", "groupings"],
    description:
      "Exactly two groupings each partition every supplied cell exactly once among 2..3 zones with unique IDs. Each zone is orthogonally contiguous through supplied cells; gaps are never filled.",
  },
  {
    id: "aggregation",
    paths: ["cells", "groupings", "measure", "rateBase"],
    description:
      "Zone records and populations are summed before dividing. Normalized values are summed records * common rateBase / summed population; never average cell rates. Both partitions preserve overall totals.",
  },
];
