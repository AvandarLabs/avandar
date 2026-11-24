import { describe, expect, it } from "vitest";
import {
  createRetroReviewIssueFromFeature,
  getFeaturesFromFeatureLog,
  getFeaturesInReviewOrder,
  getReviewTierFromSection,
} from "./buildRetroReviewIssues";

const FEATURE_LOG = `
| ID | Feature | Status | Depends on | PR |
| --- | --- | --- | --- | --- |
| F1 | Case statuses | not started | | |
| F2 | Catalog search | merged: [#314](https://example.test/314) | F1 | |

## F1: Case statuses

Adds RLS policies on \`concept_statuses\`.

## F2: Catalog search

A search box in the catalog view.
`;

describe("getFeaturesFromFeatureLog", () => {
  it("reads each table row and its section", () => {
    expect(getFeaturesFromFeatureLog(FEATURE_LOG)).toEqual([
      {
        id: "F1",
        title: "Case statuses",
        section: "Adds RLS policies on `concept_statuses`.",
      },
      {
        id: "F2",
        title: "Catalog search",
        section: "A search box in the catalog view.",
      },
    ]);
  });
});

describe("getReviewTierFromSection", () => {
  it.each([
    ["Adds RLS policies on a table.", "security"],
    ["Grants execute to anon.", "security"],
    ["Adds supabase/migrations/2026_x.sql and a sync job.", "data"],
    ["A search box in the catalog view.", "ui"],
  ])("puts %j in the %s tier", (section, tier) => {
    expect(getReviewTierFromSection(section)).toBe(tier);
  });
});

describe("getFeaturesInReviewOrder", () => {
  it("puts security, then data, then ui, keeping log order in a tier", () => {
    const features = [
      { id: "F1", title: "Search box", section: "A search box." },
      { id: "F2", title: "Sync job", section: "Adds a sync job." },
      { id: "F3", title: "Policies", section: "Adds RLS policies." },
      { id: "F4", title: "Map view", section: "A map view." },
      { id: "F5", title: "Grants", section: "Grants execute to anon." },
    ];

    expect(
      getFeaturesInReviewOrder(features).map((feature) => {
        return feature.id;
      }),
    ).toEqual(["F3", "F5", "F2", "F1", "F4"]);
  });
});

describe("createRetroReviewIssueFromFeature", () => {
  it("titles, labels, and pins the issue", () => {
    const issue = createRetroReviewIssueFromFeature({
      feature: { id: "F1", title: "Case statuses", section: "Adds RLS." },
      pinnedSha: "abc1234",
    });

    expect(issue.title).toBe("Retro review F1: Case statuses");
    expect(issue.labels).toEqual(["retro-review", "retro-review:security"]);
    expect(issue.body).toContain(
      "https://github.com/AvandarLabs/avandar/blob/abc1234/docs/measles-demo/pr-feature-log.md",
    );
  });
});
