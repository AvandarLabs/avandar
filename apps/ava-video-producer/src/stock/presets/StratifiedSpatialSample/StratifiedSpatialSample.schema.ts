import { propEq, prop } from "@avandar/utils";
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
/** Strict authored geographic sampling frame and selection. */
export const inputSchema = z
  .strictObject({
    strata: z
      .array(
        z.strictObject({
          id: identifier,
          label: z.string().max(24),
          polygon: polygonSchema,
        }),
      )
      .min(2)
      .max(4),
    sites: z
      .array(
        z.strictObject({
          id: identifier,
          label: z.string().max(20),
          stratumId: identifier,
          x: coordinate,
          y: coordinate,
        }),
      )
      .min(4)
      .max(12),
    selectedSiteIds: z.array(identifier).min(1).max(8),
    copy: z.strictObject({
      context: z.string().max(40),
      selected: z.string().max(40),
      eligible: z.string().max(40),
      unsampled: z.string().max(40),
      unit: z.string().max(40),
    }),
    showUnselectedLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    [
      input.strata.map(prop("id")),
      input.sites.map(prop("id")),
      input.selectedSiteIds,
    ].forEach((ids, index) => {
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          path: [["strata", "sites", "selectedSiteIds"][index]],
          message: "IDs must be unique.",
        });
      }
    });
    input.strata.forEach((stratum, index) => {
      if (!input.sites.some(propEq("stratumId", stratum.id))) {
        context.addIssue({
          code: "custom",
          path: ["strata", index],
          message: "Every stratum requires eligible sites.",
        });
      }
      if (
        PlanarPolygon.isSimple({ polygon: stratum.polygon }) &&
        input.strata.slice(index + 1).some(
          (other) =>
            PlanarPolygon.isSimple({ polygon: other.polygon }) &&
            PlanarPolygon.doInteriorsOverlap({
              firstPolygon: stratum.polygon,
              secondPolygon: other.polygon,
            }),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["strata", index],
          message: "Stratum interiors cannot overlap.",
        });
      }
    });
    input.sites.forEach((site, index) => {
      const stratum = input.strata.find(propEq("id", site.stratumId));
      if (
        !stratum ||
        (PlanarPolygon.isSimple({ polygon: stratum.polygon }) &&
          PlanarPolygon.getPointClassification({
            point: [site.x, site.y],
            polygon: stratum.polygon,
          }) !== "inside")
      ) {
        context.addIssue({
          code: "custom",
          path: ["sites", index],
          message: "A site must be strictly inside its referenced stratum.",
        });
      }
    });
    if (
      input.selectedSiteIds.some((id) => !input.sites.some(propEq("id", id)))
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectedSiteIds"],
        message: "Selected IDs must reference sites.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Exact geometric, identity and denominator constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["strata.*.id", "sites.*.id", "selectedSiteIds"],
    description:
      "IDs are unique within each collection; one empty ID is allowed. Coincident sites remain distinct.",
  },
  {
    id: "disjoint-strata",
    paths: ["strata.*.polygon"],
    description:
      "Simple finite open nondegenerate rings have no repeated vertices, self-touch or backtracking. Interiors do not overlap; shared borders and vertices are allowed.",
  },
  {
    id: "eligible-frame",
    paths: ["sites.*.stratumId", "sites.*.x", "sites.*.y", "strata"],
    description:
      "Every site references an existing stratum and lies strictly inside it, never on its boundary or in a foreign stratum. Every stratum has at least one eligible site.",
  },
  {
    id: "authored-selection",
    paths: ["selectedSiteIds", "sites.*.id"],
    description:
      "All selected IDs exist. A stratum may have zero selected sites; all eligible sites and denominators remain visible.",
  },
];
