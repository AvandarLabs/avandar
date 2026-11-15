import { z } from "zod";
import { getClosedInteriorEncounterFromSegments } from "./getClosedInteriorEncounterFromSegments";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and semantic constraints. */
export const inputSchema = z
  .strictObject({
    locations: z.strictObject({
      depotLabel: z.string().min(0).max(24),
      destinationLabel: z.string().min(0).max(24),
      junctionLabel: z.string().min(0).max(24),
    }),
    routes: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(24),
          role: z.enum(["blocked", "detour"]),
          points: z
            .array(
              z.strictObject({
                x: z.number().finite().min(0.1).max(0.9),
                y: z.number().finite().min(0.1).max(0.9),
              }),
            )
            .min(4)
            .max(6),
        }),
      )
      .min(2)
      .max(2),
    obstruction: z.strictObject({
      segmentIndex: z.number().finite().int().min(1).max(4),
      kind: z.enum(["barrier", "bridge-closure"]),
      label: z.string().min(0).max(26),
    }),
    vehicle: z.enum(["truck", "cargo-bike"]),
    scenarioCaption: z.string().min(1).max(48),
    showRouteLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    const blocked = input.routes.find(({ role }) => role === "blocked");
    const detour = input.routes.find(({ role }) => role === "detour");
    if (!blocked || !detour) {
      issue("routes", "Exactly one route per role is required.");
      return;
    }
    const start = blocked.points[input.obstruction.segmentIndex];
    const end = blocked.points[input.obstruction.segmentIndex + 1];
    if (!start || !end) {
      issue(
        "obstruction",
        "The segment index must be at most blocked points.length - 2.",
      );
      return;
    }
    if (
      ![0, 1, -1].every((index) => {
        const first = blocked.points.at(index);
        const second = detour.points.at(index);
        return first && second && first.x === second.x && first.y === second.y;
      })
    ) {
      issue(
        "routes",
        "Routes must share their first two points and final point.",
      );
    }
    if (
      detour.points.slice(1).some(
        (to, index) =>
          getClosedInteriorEncounterFromSegments({
            from: detour.points[index],
            to,
            start,
            end,
          }) !== undefined,
      )
    ) {
      issue(
        "routes",
        "The detour must avoid every crossing or overlap of the closed segment interior.",
      );
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints and conserved quantities. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "convoy-route-detour.0",
    paths: ["routes.*.role"],
    description:
      "Exactly two routes contain one blocked role and one detour role. Route IDs have no uniqueness requirement; empty and duplicate IDs are accepted.",
  },
  {
    id: "convoy-route-detour.1",
    paths: ["routes.*.points"],
    description:
      "Routes share exactly equal first two points and final point. Repeated points and zero-length routes are accepted and hold stationary.",
  },
  {
    id: "convoy-route-detour.2",
    paths: ["obstruction.segmentIndex", "routes.*.points"],
    description:
      "segmentIndex is an integer from 1 through blocked.points.length - 2, inclusive.",
  },
  {
    id: "convoy-route-detour.3",
    paths: ["routes.*.points", "obstruction.segmentIndex"],
    description:
      "Every detour segment must avoid every contact with the open interior of the selected blocked segment, including a stationary point or a detour endpoint, crossing and positive-length overlap. The blocked segment endpoints may be shared. A zero-length blocked segment has an empty interior.",
  },
  {
    id: "convoy-route-detour.4",
    paths: ["routes", "obstruction"],
    description:
      "The vehicle stops before the earliest closed-interior encounter along the blocked prefix, reverses along the safe prefix to the shared second point, then follows the supplied detour. Closure persists after arrival; paths do not imply verified access.",
  },
];
