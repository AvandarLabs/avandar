import hdxTopics from "@pipelines/hdx/mappers/hdxTopics/hdxTopics";
import { describe, expect, it } from "vitest";

describe("hdxTopics", () => {
  it("lists the topic of each tag, once, in the order the tags first reach it", () => {
    expect(
      hdxTopics({
        tags: [
          { name: "vaccination-immunization" },
          { name: "roads" },
          { name: "epidemics-outbreaks" },
          { name: "education facilities-schools" },
        ],
      }),
    ).toEqual(["Health", "Transportation", "Education"]);
  });

  it("matches a tag whatever its case or surrounding spaces", () => {
    expect(hdxTopics({ tags: [{ name: "  Food Security " }] })).toEqual([
      "Food Security & Nutrition",
    ]);
  });

  it("gives no topic to a tag that names a region or a data format", () => {
    expect(
      hdxTopics({
        tags: [{ name: "west africa" }, { name: "hxl" }, { name: "geodata" }],
      }),
    ).toEqual([]);
  });

  it("gives no topic to a tag outside HDX's vocabulary", () => {
    expect(hdxTopics({ tags: [{ name: "measles" }] })).toEqual([]);
  });

  it("does not read inherited object properties as tags", () => {
    expect(hdxTopics({ tags: [{ name: "constructor" }] })).toEqual([]);
  });

  it("returns an empty list when the record has no tags", () => {
    expect([hdxTopics({}), hdxTopics(null)]).toEqual([[], []]);
  });
});
