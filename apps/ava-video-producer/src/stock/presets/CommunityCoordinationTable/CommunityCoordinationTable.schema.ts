import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and cross-field validation. */
export const inputSchema = z
  .strictObject({
    places: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(24),
          x: z.number().finite().min(0.15).max(0.85),
          y: z.number().finite().min(0.15).max(0.85),
          requestLabel: z.string().min(0).max(30),
        }),
      )
      .min(2)
      .max(4),
    teams: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(24),
          serviceLabel: z.string().min(0).max(22),
          initialPlaceId: z.string().min(0).max(24),
          agreedPlaceId: z.string().min(0).max(24),
        }),
      )
      .min(2)
      .max(4),
    communityLabel: z.string().min(1).max(30),
    planLabels: z.strictObject({
      initial: z.string().min(0).max(28),
      agreed: z.string().min(0).max(28),
      unassigned: z.string().min(0).max(28),
    }),
    showUnassignedRequests: z.boolean(),
    markerStyle: z.enum(["flags", "wooden-pieces"]),
    scenarioCaption: z.string().min(1).max(54),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (new Set(input.places.map(prop("id"))).size !== input.places.length) {
      issue("places", "Place IDs must be unique.");
    }
    if (new Set(input.teams.map(prop("id"))).size !== input.teams.length) {
      issue("teams", "Team IDs must be unique.");
    }
    input.places.forEach((place, index) =>
      input.places.slice(index + 1).forEach((other) => {
        if (
          Math.hypot(place.x - other.x, place.y - other.y) <
          0.2 - Number.EPSILON
        ) {
          issue("places", "Place separation must be at least 0.2.");
        }
      }),
    );
    input.teams.forEach((team) => {
      if (
        ![team.initialPlaceId, team.agreedPlaceId].every((reference) =>
          input.places.some(({ id }) => id === reference),
        )
      ) {
        issue("teams", "Every place reference must exist.");
      }
    });
    const moved = input.teams.filter(
      (team) => team.initialPlaceId !== team.agreedPlaceId,
    );
    if (moved.length !== 1) {
      issue("teams", "Exactly one team changes place.");
    }
    const movingTeam = moved[0];
    if (
      movingTeam &&
      input.teams.filter(propEq("initialPlaceId", movingTeam.initialPlaceId))
        .length < 2
    ) {
      issue("teams", "The moving team's starting place must be shared.");
    }
  }) satisfies z.ZodType;
/** Input inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "community-coordination-table.0",
    paths: ["places.*.id", "teams.*.id"],
    description:
      "Place IDs and team IDs are separately unique, each allowing at most one empty ID.",
  },
  {
    id: "community-coordination-table.1",
    paths: ["places.*.x", "places.*.y"],
    description:
      "Coordinates are 0.15..0.85 with Euclidean normalized separation >=0.2. Floating comparison permits only Number.EPSILON rounding tolerance.",
  },
  {
    id: "community-coordination-table.2",
    paths: ["teams.*.initialPlaceId", "teams.*.agreedPlaceId", "places.*.id"],
    description:
      "Every initial and agreed place reference exists. Exactly one team changes place; at least two teams initially share its origin.",
  },
  {
    id: "community-coordination-table.3",
    paths: [
      "teams.*.serviceLabel",
      "places.*.requestLabel",
      "planLabels",
      "scenarioCaption",
    ],
    description:
      "Service compatibility with the destination request is author-validated meaning, not literal string equality. Labels describe planning, with fictional schematic geography. Hidden optional unassigned captions never erase request tags.",
  },
];
