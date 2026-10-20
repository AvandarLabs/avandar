import { prop } from "@avandar/utils";
import { z } from "zod";
import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const coordinate: z.ZodNumber = z.number().min(0).max(100);
const identifier: z.ZodString = z.string().max(12);
const polygonSchema: z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>> =
  z
    .array(z.tuple([coordinate, coordinate]))
    .min(3)
    .max(8)
    .refine(
      (polygon) => PlanarPolygon.isSimple({ polygon }),
      "Requires a simple open polygon.",
    );
/** Complete strict catchment and household input. */
export const inputSchema = z
  .strictObject({
    catchments: z
      .array(
        z.strictObject({
          id: identifier,
          label: z.string().max(28),
          polygon: polygonSchema,
        }),
      )
      .min(1)
      .max(4),
    households: z
      .array(
        z.strictObject({
          id: identifier,
          label: z.string().max(20),
          x: coordinate,
          y: coordinate,
          members: z.number().int().min(1).max(8),
        }),
      )
      .min(2)
      .max(12),
    measure: z.enum(["households", "members"]),
    gapEmphasis: z.enum(["outline", "hatch"]),
    copy: z.strictObject({
      context: z.string().max(40),
      covered: z.string().max(40),
      uncovered: z.string().max(40),
      overlap: z.string().max(40),
      total: z.string().max(40),
      households: z.string().max(40),
      members: z.string().max(40),
    }),
    showOriginalOutlines: z.boolean(),
  })
  .superRefine((input, context) => {
    ["catchments", "households"].forEach((key) => {
      const records = input[key as "catchments" | "households"];
      if (
        new Set(records.map(prop<{ id: string }, "id", string>("id"))).size !==
        records.length
      ) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "IDs must be unique.",
        });
      }
    });
    input.households.forEach((household, index) => {
      if (
        input.catchments.some(
          ({ polygon }) =>
            PlanarPolygon.isSimple({ polygon }) &&
            PlanarPolygon.getPointClassification({
              point: [household.x, household.y],
              polygon,
            }) === "boundary",
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["households", index],
          message: "Households cannot lie on a catchment boundary.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Constraints requiring geometric or collection validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["catchments.*.id", "households.*.id"],
    description:
      "IDs are unique within each collection, including at most one empty ID. Coincident households retain separate identities.",
  },
  {
    id: "simple-catchments",
    paths: ["catchments.*.polygon"],
    description:
      "Every open ring is simple, finite, nondegenerate and has no repeated vertices, self-touch or backtracking. Overlapping and identical catchments are allowed.",
  },
  {
    id: "boundary-exclusion",
    paths: ["households.*.x", "households.*.y", "catchments.*.polygon"],
    description:
      "No household lies on any catchment boundary. Union membership counts each supplied household once; covered plus uncovered equals the full household or member denominator.",
  },
];
