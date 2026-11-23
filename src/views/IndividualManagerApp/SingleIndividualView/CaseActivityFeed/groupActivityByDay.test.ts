import { describe, expect, it } from "vitest";
import { groupActivityByDay } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/groupActivityByDay";

describe("groupActivityByDay", () => {
  it("starts a new group whenever the local day changes, keeping order", () => {
    const groups = groupActivityByDay([
      { id: "a", occurredAt: "2026-10-27T09:14:00" },
      { id: "b", occurredAt: "2026-10-27T13:40:00" },
      { id: "c", occurredAt: "2026-10-28T10:02:00" },
    ]);
    expect(
      groups.map((group) => {
        return group.entries.map((entry) => {
          return entry.id;
        });
      }),
    ).toEqual([["a", "b"], ["c"]]);
  });
});
