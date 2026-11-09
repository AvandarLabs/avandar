import hdxKeywords from "@pipelines/hdx/mappers/hdxKeywords/hdxKeywords";
import { describe, expect, it } from "vitest";

describe("hdxKeywords", () => {
  it("lists each tag, then the title of each group the package is in", () => {
    expect(
      hdxKeywords({
        tags: [{ name: "health" }, { name: "indicators" }],
        groups: [{ title: "Burkina Faso" }, { title: "Mali" }],
      }),
    ).toEqual(["health", "indicators", "Burkina Faso", "Mali"]);
  });

  it("lists the groups alone when the package has no tags", () => {
    expect(hdxKeywords({ groups: [{ title: "World" }] })).toEqual(["World"]);
  });

  it("returns an empty list when the record has neither", () => {
    expect([hdxKeywords({}), hdxKeywords(null)]).toEqual([[], []]);
  });
});
