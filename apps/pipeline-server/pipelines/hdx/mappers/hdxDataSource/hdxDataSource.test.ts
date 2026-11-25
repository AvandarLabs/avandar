import hdxDataSource from "@pipelines/hdx/mappers/hdxDataSource/hdxDataSource";
import { describe, expect, it } from "vitest";

describe("hdxDataSource", () => {
  it("returns the source the package's data comes from", () => {
    expect(
      hdxDataSource({
        organization: { title: "OCHA Somalia" },
        dataset_source: " World Health Organization ",
      }),
    ).toBe("World Health Organization");
  });

  it("returns undefined when the source is the publishing organization", () => {
    expect(
      hdxDataSource({
        organization: { title: "World Health Organization" },
        dataset_source: "world health organization",
      }),
    ).toBeUndefined();
  });

  it("returns the source when the package has no organization", () => {
    expect(hdxDataSource({ dataset_source: "UNHCR" })).toBe("UNHCR");
  });

  it("returns undefined when the package has no source", () => {
    expect([
      hdxDataSource({ organization: { title: "UNHCR" } }),
      hdxDataSource({ dataset_source: "  " }),
      hdxDataSource(null),
    ]).toEqual([undefined, undefined, undefined]);
  });
});
