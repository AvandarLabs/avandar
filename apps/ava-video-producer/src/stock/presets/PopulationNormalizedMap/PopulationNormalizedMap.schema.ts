import { prop } from "@avandar/utils";
import { z } from "zod";
import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
import { getPopulationRateFromCounts } from "./getPopulationRateFromCounts";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const coordinate: z.ZodNumber = z.number().min(0).max(100);
const polygonSchema: z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>> =
  z
    .array(z.tuple([coordinate, coordinate]))
    .min(3)
    .max(8)
    .refine(
      (polygon) => PlanarPolygon.isSimple({ polygon }),
      "Requires a simple open polygon.",
    );
/** Strict count-to-rate input with explicit non-clipping color domains. */
export const inputSchema = z
  .strictObject({
    zones: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().max(24),
          polygon: polygonSchema,
          records: z.number().int().min(0).max(100),
          population: z.number().int().min(1).max(1000),
        }),
      )
      .min(2)
      .max(4),
    rateBase: z.union([
      z.literal(1),
      z.literal(10),
      z.literal(100),
      z.literal(1000),
    ]),
    colorDomains: z.strictObject({
      countMaximum: z.number().gt(0).max(100000),
      normalizedMaximum: z.number().gt(0).max(100000),
    }),
    periodLabel: z.string().min(1).max(36),
    copy: z.strictObject({
      context: z.string().max(40),
      countLegend: z.string().max(40),
      normalizedLegend: z.string().max(40),
      records: z.string().max(40),
      population: z.string().max(40),
      per: z.string().max(40),
    }),
    keepFractionsVisible: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.zones.map(prop("id"))).size !== input.zones.length) {
      context.addIssue({
        code: "custom",
        path: ["zones"],
        message: "Zone IDs must be unique.",
      });
    }
    input.zones.forEach((zone, index) => {
      if (zone.records > zone.population) {
        context.addIssue({
          code: "custom",
          path: ["zones", index, "records"],
          message: "Unique records cannot exceed population.",
        });
      }
      if (
        zone.records > input.colorDomains.countMaximum ||
        getPopulationRateFromCounts({ ...zone, rateBase: input.rateBase }) >
          input.colorDomains.normalizedMaximum
      ) {
        context.addIssue({
          code: "custom",
          path: ["colorDomains"],
          message:
            "Legend domains must cover every supplied and derived value.",
        });
      }
      if (
        PlanarPolygon.isSimple({ polygon: zone.polygon }) &&
        input.zones.slice(index + 1).some(
          (other) =>
            PlanarPolygon.isSimple({ polygon: other.polygon }) &&
            PlanarPolygon.doInteriorsOverlap({
              firstPolygon: zone.polygon,
              secondPolygon: other.polygon,
            }),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["zones", index],
          message: "Zone interiors cannot overlap.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Geometry, conservation and explicit-domain constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-zones",
    paths: ["zones.*.id"],
    description: "Zone IDs are unique, including at most one empty ID.",
  },
  {
    id: "disjoint-zones",
    paths: ["zones.*.polygon"],
    description:
      "Simple finite nondegenerate open polygons have no repeated vertices, self-touch or backtracking. Interiors do not overlap; shared borders and vertices are allowed.",
  },
  {
    id: "unique-records",
    paths: ["zones.*.records", "zones.*.population"],
    description:
      "Each zone has records <= population. Population denominators remain unchanged throughout normalization.",
  },
  {
    id: "non-clipping-domains",
    paths: ["zones", "rateBase", "colorDomains"],
    description:
      "countMaximum >= every records value; normalizedMaximum >= every records/population*rateBase value. Both domains are >0 and <=100000, including exact maximum equality. No clipping or implicit rescaling.",
  },
];
