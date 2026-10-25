import { afterEach, describe, expect, it, vi } from "vitest";
import { getRelationFreshnessNow } from "@/clients/qetl/RelationCache/getRelationFreshnessNow/getRelationFreshnessNow";

describe("getRelationFreshnessNow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is the current time while online", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);

    expect(getRelationFreshnessNow()).toBe(1_800_000_000_000);
  });

  it("is before every stale-at time while offline, so a stored relation is never judged stale", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    expect(getRelationFreshnessNow()).toBe(Number.NEGATIVE_INFINITY);
  });
});
