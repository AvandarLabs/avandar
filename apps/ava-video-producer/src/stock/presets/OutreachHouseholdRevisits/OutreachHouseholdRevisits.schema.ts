import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with bounded collections and semantic validation. */
export const inputSchema = z
  .strictObject({
    households: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(16),
          x: z.number().finite().min(0.1).max(0.9),
          y: z.number().finite().min(0.1).max(0.9),
        }),
      )
      .min(3)
      .max(8),
    visits: z
      .array(
        z.strictObject({
          householdId: z.string().min(0).max(16),
          contacted: z.boolean(),
        }),
      )
      .min(1)
      .max(8),
    sceneLabel: z.string().min(1).max(40),
    showVisitStamps: z.boolean(),
    showUniqueLedger: z.boolean(),
    copy: z.strictObject({
      map: z.string().min(1).max(42),
      visits: z.string().min(1).max(42),
      visited: z.string().min(1).max(42),
      contacted: z.string().min(1).max(42),
      noContact: z.string().min(1).max(42),
      unvisited: z.string().min(1).max(42),
      denominator: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    const ids = new Set(input.households.map(prop("id")));
    if (ids.size !== input.households.length) {
      context.addIssue({
        code: "custom",
        message: "Household identities must be unique.",
        path: ["households"],
      });
    }
    input.households.forEach((household, index) => {
      input.households.slice(index + 1).forEach((other) => {
        if (Math.hypot(household.x - other.x, household.y - other.y) < 0.18) {
          context.addIssue({
            code: "custom",
            message: "Household centers need separation of at least 0.18.",
            path: ["households"],
          });
        }
      });
    });
    input.visits.forEach((visit, index) => {
      if (
        !ids.has(visit.householdId) ||
        input.visits.filter(
          ({ householdId }) => householdId === visit.householdId,
        ).length > 3
      ) {
        context.addIssue({
          code: "custom",
          message: "Visits must reference a household at most three times.",
          path: ["visits", index, "householdId"],
        });
      }
    });
  }) satisfies z.ZodType;
/** Input is inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "outreach-household-revisits.0",
    paths: [
      "households",
      "visits",
      "sceneLabel",
      "showVisitStamps",
      "showUniqueLedger",
      "copy",
    ],
    description:
      "The denominator is households.length and represents households, never residents or eligible people. Each home glyph is one household, independent of drawn house size.",
  },
  {
    id: "outreach-household-revisits.1",
    paths: [
      "households",
      "visits",
      "sceneLabel",
      "showVisitStamps",
      "showUniqueLedger",
      "copy",
    ],
    description:
      "Total visits is visits.length. Unique visited households is the distinct householdId count; unique contacted households is the distinct householdId count among visits marked contacted. These nested measures must not be added together.",
  },
  {
    id: "outreach-household-revisits.2",
    paths: [
      "households",
      "visits",
      "sceneLabel",
      "showVisitStamps",
      "showUniqueLedger",
      "copy",
    ],
    description:
      "Each household's final exclusive state is contacted if any visit made contact, visited-no-contact if visited but never contacted, or unvisited. These three state counts sum to the household denominator.",
  },
  {
    id: "outreach-household-revisits.3",
    paths: [
      "households",
      "visits",
      "sceneLabel",
      "showVisitStamps",
      "showUniqueLedger",
      "copy",
    ],
    description:
      "The local map is invented, normalized, and not georeferenced. Contact means only the supplied outreach encounter, not consent, service receipt, vaccination, health impact, or complete community coverage.",
  },
  {
    id: "outreach-household-revisits.household-identities",
    paths: ["households.*.id"],
    description:
      "Household IDs must be unique. An empty string remains a valid ID when unique.",
  },
  {
    id: "outreach-household-revisits.household-separation",
    paths: ["households.*.x", "households.*.y"],
    description:
      "Every pair of household centers must have normalized Euclidean separation of at least 0.18.",
  },
  {
    id: "outreach-household-revisits.visit-references",
    paths: ["visits.*.householdId", "households.*.id"],
    description:
      "Every visit householdId must reference a supplied household ID, including an existing empty-string ID.",
  },
  {
    id: "outreach-household-revisits.revisit-limit",
    paths: ["visits.*.householdId"],
    description:
      "There may be at most 3 visits per household across the complete authored visit sequence.",
  },
];
