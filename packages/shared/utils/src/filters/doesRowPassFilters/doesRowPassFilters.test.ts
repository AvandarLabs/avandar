import { describe, expect, it } from "vitest";
import { doesRowPassFilters } from "./doesRowPassFilters.ts";

describe("doesRowPassFilters", () => {
  it("passes when every operator succeeds", () => {
    const row = { id: "1", status: "active" };
    const filters = {
      id: { eq: "1" },
      status: { in: ["active", "pending"] },
    } as const;

    expect(doesRowPassFilters(row, filters)).toBe(true);
  });

  it("fails when any operator fails", () => {
    const row = { id: "1", status: "active" };
    const filters = {
      id: { eq: "2" },
    } as const;

    expect(doesRowPassFilters(row, filters)).toBe(false);
  });

  it("treats missing operator records as passes", () => {
    const row = { id: "1" };
    const filters = {
      id: undefined,
    } as const;

    expect(doesRowPassFilters(row, filters)).toBe(true);
  });
});
