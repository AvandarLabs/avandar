import { buildCatalogFieldPathReader } from "@etl/EtlConfig/buildCatalogFieldPathReader/buildCatalogFieldPathReader";
import { describe, expect, it } from "vitest";

const RECORD = {
  resource: { name: "Trips", attribution: null },
  groups: [{ title: "Kenya" }, { title: "Chad" }],
};

describe("buildCatalogFieldPathReader", () => {
  it("reads a nested value", () => {
    expect(buildCatalogFieldPathReader("resource.name")(RECORD)).toBe("Trips");
  });

  it("indexes an array with a numeric segment", () => {
    expect(buildCatalogFieldPathReader("groups.1.title")(RECORD)).toBe("Chad");
  });

  it.each([
    ["a missing key", "resource.description"],
    ["a path through null", "resource.attribution.name"],
    ["a non-numeric segment on an array", "groups.title"],
    ["a path past a string", "resource.name.length"],
  ])("returns undefined for %s", (_name, path) => {
    expect(buildCatalogFieldPathReader(path)(RECORD)).toBeUndefined();
  });

  it("never reads inherited properties", () => {
    expect(
      buildCatalogFieldPathReader("resource.constructor")(RECORD),
    ).toBeUndefined();
  });
});
