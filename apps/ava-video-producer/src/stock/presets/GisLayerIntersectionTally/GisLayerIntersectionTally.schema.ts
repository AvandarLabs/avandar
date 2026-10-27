import { prop } from "@avandar/utils";
import { z } from "zod";
import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with strict structural bounds. */
export const inputSchema = z
  .strictObject({
    layers: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(12),
          label: z.string().min(0).max(28),
          polygon: z
            .array(
              z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
            )
            .min(3)
            .max(8),
        }),
      )
      .min(2)
      .max(2),
    households: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(12),
          label: z.string().min(0).max(20),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          members: z.number().int().min(1).max(8),
        }),
      )
      .min(2)
      .max(12),
    operation: z.enum(["intersection", "first-minus-second"]),
    measure: z.enum(["households", "members"]),
    copy: z.strictObject({
      context: z.string().min(0).max(40),
      intersection: z.string().min(0).max(40),
      difference: z.string().min(0).max(40),
      selected: z.string().min(0).max(40),
      total: z.string().min(0).max(40),
      households: z.string().min(0).max(40),
      members: z.string().min(0).max(40),
    }),
    showLayerOutlines: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.layers.map(prop("id"))).size !== input.layers.length ||
      new Set(input.households.map(prop("id"))).size !== input.households.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["layers"],
        message: "Layer and household IDs must each be unique.",
      });
    }
    input.layers.forEach((layer, index) => {
      if (!PlanarPolygon.isSimple({ polygon: layer.polygon })) {
        context.addIssue({
          code: "custom",
          path: ["layers", index, "polygon"],
          message: "A layer requires a nondegenerate simple open polygon.",
        });
        return;
      }
      input.households.forEach((household) => {
        if (
          PlanarPolygon.getPointClassification({
            point: [household.x, household.y],
            polygon: layer.polygon,
          }) === "boundary"
        ) {
          context.addIssue({
            code: "custom",
            path: ["households"],
            message: "Households cannot lie on a polygon boundary.",
          });
        }
      });
    });
  }) satisfies z.ZodType;
/** Authored input inferred from the runtime schema. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime cross-field rules in the complete export. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "1",
    paths: ["layers.*.id", "households.*.id"],
    description:
      "IDs are unique within each collection. One empty ID is allowed in each collection.",
  },
  {
    id: "2",
    paths: ["layers.*.polygon"],
    description:
      "Each polygon is a finite nondegenerate simple open ring of 3..8 vertices. Repeated vertices, self intersections, nonadjacent edge contacts and backtracking are invalid. Concavity, either winding and nonoverlapping collinear vertices are valid, without a minimum area.",
  },
  {
    id: "3",
    paths: ["households.*.x", "households.*.y", "layers.*.polygon"],
    description:
      "No household point lies exactly on any layer edge or vertex. Coincident household records are permitted.",
  },
  {
    id: "4",
    paths: ["copy.context"],
    description:
      "The author identifies fictional schematic geography in the context copy. This editorial meaning is not machine-inferred from a language-specific phrase.",
  },
];
