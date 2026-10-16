import { describe, expect, it } from "vitest";
import { makeSourceVersionFromSocrataViewMetadata } from "$/connectors/open-data/buildSocrataSourceVersion.ts";

describe("makeSourceVersionFromSocrataViewMetadata", () => {
  it("prefers rowsUpdatedAt when present", () => {
    expect(
      makeSourceVersionFromSocrataViewMetadata({
        id: "x",
        name: "x",
        rowsUpdatedAt: 1792114673,
        viewLastModified: 1767021900,
      }),
    ).toBe("socrata:rowsUpdatedAt:1792114673");
  });

  it("falls back to viewLastModified when rowsUpdatedAt is absent", () => {
    expect(
      makeSourceVersionFromSocrataViewMetadata({
        id: "x",
        name: "x",
        rowsUpdatedAt: undefined,
        viewLastModified: 1767021900,
      }),
    ).toBe("socrata:viewLastModified:1767021900");
  });

  it("returns undefined when neither field is present", () => {
    expect(
      makeSourceVersionFromSocrataViewMetadata({
        id: "x",
        name: "x",
        rowsUpdatedAt: undefined,
        viewLastModified: undefined,
      }),
    ).toBeUndefined();
  });

  it("cannot collide with a viewLastModified-derived token sharing the same number", () => {
    const fromRows = makeSourceVersionFromSocrataViewMetadata({
      id: "x",
      name: "x",
      rowsUpdatedAt: 1767021900,
      viewLastModified: undefined,
    });
    const fromView = makeSourceVersionFromSocrataViewMetadata({
      id: "x",
      name: "x",
      rowsUpdatedAt: undefined,
      viewLastModified: 1767021900,
    });
    expect(fromRows).not.toBe(fromView);
  });
});
