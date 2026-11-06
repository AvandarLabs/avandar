import { prop, propEq, propNotEq } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and semantic constraints. */
export const inputSchema = z
  .strictObject({
    requests: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(28),
        }),
      )
      .min(2)
      .max(3),
    contributions: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          donorLabel: z.string().min(0).max(24),
          mark: z.string().min(1).max(2),
          credits: z.number().finite().int().min(1).max(5),
          earmarkedRequestId: z.string().min(0).max(24).nullable(),
        }),
      )
      .min(2)
      .max(4),
    allocations: z
      .array(
        z.strictObject({
          contributionId: z.string().min(0).max(24),
          requestId: z.string().min(0).max(24),
          credits: z.number().finite().int().min(1).max(5),
        }),
      )
      .min(2)
      .max(8),
    labels: z.strictObject({
      coordinator: z.string().min(0).max(26),
      pool: z.string().min(0).max(26),
      earmarked: z.string().min(0).max(26),
      flexible: z.string().min(0).max(26),
      allocated: z.string().min(0).max(26),
      remaining: z.string().min(0).max(26),
      unit: z.string().min(0).max(26),
    }),
    showAllocationTotals: z.boolean(),
    envelopeArrangement: z.enum(["fan", "side-by-side"]),
    scenarioCaption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    [input.requests, input.contributions].forEach((items) => {
      if (
        new Set(items.map(prop<{ id: string }, "id", string>("id"))).size !==
        items.length
      ) {
        issue(
          "contributions",
          "Request and contribution IDs must each be unique.",
        );
      }
    });
    if (
      new Set(input.contributions.map(prop("mark"))).size !==
      input.contributions.length
    ) {
      issue(
        "contributions",
        "Contributor marks must be unique literal strings.",
      );
    }
    if (
      input.contributions.reduce((sum, item) => sum + item.credits, 0) > 14 ||
      !input.contributions.some(propEq("earmarkedRequestId", null)) ||
      !input.contributions.some(propNotEq("earmarkedRequestId", null))
    ) {
      issue(
        "contributions",
        "Total credits must be at most 14 with at least one earmarked and one flexible contribution.",
      );
    }
    input.contributions.forEach((item) => {
      if (
        item.earmarkedRequestId !== null &&
        !input.requests.some(({ id }) => id === item.earmarkedRequestId)
      ) {
        issue(
          "contributions",
          "Every non-null earmark must reference an existing request.",
        );
      }
      if (
        input.allocations
          .filter(({ contributionId }) => contributionId === item.id)
          .reduce((sum, allocation) => sum + allocation.credits, 0) >
        item.credits
      ) {
        issue("allocations", "Allocations may not overspend a contribution.");
      }
    });
    input.allocations.forEach((allocation, index) => {
      const contributor = input.contributions.find(
        ({ id }) => id === allocation.contributionId,
      );
      if (
        !contributor ||
        !input.requests.some(({ id }) => id === allocation.requestId) ||
        (contributor.earmarkedRequestId !== null &&
          contributor.earmarkedRequestId !== allocation.requestId)
      ) {
        issue(
          "allocations",
          "Allocation references must exist and respect the contributor earmark.",
        );
      }
      if (
        input.allocations
          .slice(0, index)
          .some(
            (prior) =>
              prior.contributionId === allocation.contributionId &&
              prior.requestId === allocation.requestId,
          )
      ) {
        issue("allocations", "Contribution/request pairs must be unique.");
      }
    });
    if (
      input.requests.some(
        ({ id }) =>
          !input.allocations.some(({ requestId }) => id === requestId),
      )
    ) {
      issue("allocations", "Every request must receive at least one credit.");
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints and conserved quantities. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "pooled-donor-allocation.0",
    paths: ["requests.*.id", "contributions.*.id"],
    description:
      "IDs must be unique within requests and contributions separately. Empty IDs remain valid references when present.",
  },
  {
    id: "pooled-donor-allocation.1",
    paths: ["contributions.*.mark"],
    description:
      "Marks are unique exact strings of length 1..2, including whitespace. Whitespace presentation marks remain visually distinct from literal marker glyphs.",
  },
  {
    id: "pooled-donor-allocation.2",
    paths: ["contributions.*.credits", "contributions.*.earmarkedRequestId"],
    description:
      "Total contribution credits <=14. At least one contribution has a null earmark and at least one has a non-null earmark. Every non-null earmark references an existing request ID; an empty request ID is distinct from null.",
  },
  {
    id: "pooled-donor-allocation.3",
    paths: ["allocations.*.contributionId", "allocations.*.requestId"],
    description:
      "Every allocation references an existing contribution and request. Contribution/request pairs are unique and each request receives at least one credit.",
  },
  {
    id: "pooled-donor-allocation.4",
    paths: ["allocations.*.credits", "contributions.*.credits"],
    description:
      "Per-contribution allocated sum <= contribution credits. Residual is exactly contribution credits minus that sum. Each token has value one and retains donor attribution.",
  },
  {
    id: "pooled-donor-allocation.5",
    paths: ["allocations.*.requestId", "contributions.*.earmarkedRequestId"],
    description:
      "A non-null earmark permits allocation only to that exact request ID. Flexible null earmarks may split only across authored allocations.",
  },
];
