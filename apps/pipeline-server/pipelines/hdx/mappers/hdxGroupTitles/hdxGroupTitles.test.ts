import hdxGroupTitles from "@pipelines/hdx/mappers/hdxGroupTitles/hdxGroupTitles";
import { describe, expect, it } from "vitest";

describe("hdxGroupTitles", () => {
  it("lists the title of each group the package is in", () => {
    expect(
      hdxGroupTitles({
        groups: [
          { name: "bfa", title: "Burkina Faso" },
          { name: "mli", title: "Mali" },
          { name: "untitled" },
        ],
      }),
    ).toEqual(["Burkina Faso", "Mali"]);
  });

  it("returns an empty list when the record has no groups", () => {
    expect([hdxGroupTitles({}), hdxGroupTitles(null)]).toEqual([[], []]);
  });
});
