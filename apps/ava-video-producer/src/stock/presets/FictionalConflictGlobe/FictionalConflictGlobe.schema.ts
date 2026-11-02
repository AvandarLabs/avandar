import { prop } from "@avandar/utils";
import { z } from "zod";
import { projectGlobePoint } from "../../geography/projectGlobePoint/projectGlobePoint";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with bounded collections and semantic validation. */
export const inputSchema = z
  .strictObject({
    incidents: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(28),
          latitude: z.number().finite().min(-60).max(70),
          longitude: z.number().finite().min(-180).max(180),
        }),
      )
      .min(1)
      .max(4),
    longitudeSweep: z.strictObject({
      start: z.number().finite().min(-180).max(180),
      end: z.number().finite().min(-180).max(180),
    }),
    markerMeaning: z.string().min(1).max(36),
    scenarioCaption: z.string().min(1).max(54),
    showLabels: z.boolean(),
    showGraticule: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.incidents.map(prop("id"))).size !== input.incidents.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Incident identities must be unique.",
        path: ["incidents"],
      });
    }
    const sweep =
      ((input.longitudeSweep.end - input.longitudeSweep.start + 540) % 360) -
      180;
    if (Math.abs(sweep) < 40 || Math.abs(sweep) > 160) {
      context.addIssue({
        code: "custom",
        message: "Shortest longitude sweep must span forty to 160 degrees.",
        path: ["longitudeSweep"],
      });
    }
    if (
      !input.incidents.some(
        (incident) =>
          projectGlobePoint({
            ...incident,
            centerLongitude: input.longitudeSweep.end,
            centerLatitude: 0,
            radius: 1,
          }).visible,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "At least one incident must face the endpoint view.",
        path: ["incidents"],
      });
    }
  }) satisfies z.ZodType;
/** Input is inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "fictional-conflict-globe.0",
    paths: [
      "incidents",
      "longitudeSweep",
      "markerMeaning",
      "scenarioCaption",
      "showLabels",
      "showGraticule",
    ],
    description:
      "The land outline is real geographic context; every conflict location and label is invented and must be marked as such.",
  },
  {
    id: "fictional-conflict-globe.1",
    paths: [
      "incidents",
      "longitudeSweep",
      "markerMeaning",
      "scenarioCaption",
      "showLabels",
      "showGraticule",
    ],
    description:
      "X markers denote separate authored situations, not incident totals, severity, casualty counts, territorial control, or live intelligence.",
  },
  {
    id: "fictional-conflict-globe.2",
    paths: [
      "incidents",
      "longitudeSweep",
      "markerMeaning",
      "scenarioCaption",
      "showLabels",
      "showGraticule",
    ],
    description:
      "No country borders or ownership claims are drawn. Marker visibility follows the chosen view and is not a statement that hidden regions lack need.",
  },
  {
    id: "fictional-conflict-globe.3",
    paths: [
      "incidents",
      "longitudeSweep",
      "markerMeaning",
      "scenarioCaption",
      "showLabels",
      "showGraticule",
    ],
    description:
      "Six seconds supports orientation only; this is not a navigable map or an incident monitoring system.",
  },
  {
    id: "fictional-conflict-globe.incident-identities",
    paths: ["incidents.*.id"],
    description:
      "Incident IDs must be unique. Coordinates may coincide, and an empty string remains a valid ID when unique.",
  },
  {
    id: "fictional-conflict-globe.shortest-sweep",
    paths: ["longitudeSweep.start", "longitudeSweep.end"],
    description:
      "The shortest signed longitude sweep, normalized across the dateline, must have magnitude 40 to 160 degrees inclusive.",
  },
  {
    id: "fictional-conflict-globe.endpoint-visibility",
    paths: [
      "incidents.*.latitude",
      "incidents.*.longitude",
      "longitudeSweep.end",
    ],
    description:
      "At least one supplied incident must be front-facing in the endpoint view at longitudeSweep.end and center latitude 0, using the shared orthographic visibility test.",
  },
];
