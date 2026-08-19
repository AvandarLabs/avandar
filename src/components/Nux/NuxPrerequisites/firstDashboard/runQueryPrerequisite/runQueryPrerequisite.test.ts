import { describe, expect, it } from "vitest";
import { runQueryPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite/runQueryPrerequisite";
import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxPrerequisiteFacts } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";
import type { UserQueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";

const EMPTY_FACTS: NuxPrerequisiteFacts = {
  hasDataset: false,
  hasDashboard: false,
  hasPublishedDashboard: false,
};

function _queryEvent(
  trigger: UserQueryAnalyticsTrigger,
  rowCount: number,
): NuxEvent {
  return {
    name: "query.succeeded",
    payload: { trigger, rowCount },
  };
}

describe("runQueryPrerequisite.matchesEvent", () => {
  it("accepts a user-asked query that returned rows", () => {
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("sql_submit", 1)),
    ).toBe(true);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("structured_change", 4)),
    ).toBe(true);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("chat_generated", 2)),
    ).toBe(true);
  });

  it("rejects explorer-initiated runs and empty results", () => {
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("url_hydration", 10)),
    ).toBe(false);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("dataset_opened", 10)),
    ).toBe(false);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("sql_submit", 0)),
    ).toBe(false);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("structured_change", 0)),
    ).toBe(false);
    expect(
      runQueryPrerequisite.matchesEvent?.(_queryEvent("chat_generated", 0)),
    ).toBe(false);
  });
});

describe("runQueryPrerequisite.isSatisfied", () => {
  it("is never satisfied by workspace artifacts", () => {
    expect(
      runQueryPrerequisite.isSatisfied({
        ...EMPTY_FACTS,
        hasDataset: true,
        hasDashboard: true,
        hasPublishedDashboard: true,
      }),
    ).toBe(false);
  });
});
