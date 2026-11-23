import hdxTagNames from "@pipelines/hdx/mappers/hdxTagNames/hdxTagNames";
import { describe, expect, it } from "vitest";

describe("hdxTagNames", () => {
  it("lists the name of each tag", () => {
    expect(
      hdxTagNames({
        tags: [{ name: "flooding" }, { name: "climate-weather" }, {}],
      }),
    ).toEqual(["flooding", "climate-weather"]);
  });

  it("returns an empty list when the record has no tags", () => {
    expect([hdxTagNames({}), hdxTagNames(null)]).toEqual([[], []]);
  });
});
