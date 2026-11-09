import { omitRecordPaths } from "@etl/EtlConfig/omitRecordPaths/omitRecordPaths";
import { describe, expect, it } from "vitest";

describe("omitRecordPaths", () => {
  it("removes top-level and nested keys", () => {
    const record = {
      notes: "About.",
      title: "Population",
      organization: { title: "WorldPop", name: "worldpop" },
    };

    expect(omitRecordPaths(record, ["notes", "organization.title"])).toEqual({
      title: "Population",
      organization: { name: "worldpop" },
    });
  });

  it("drops an object every key of which was removed", () => {
    const record = { id: "1", organization: { title: "WorldPop" } };

    expect(omitRecordPaths(record, ["organization.title"])).toEqual({
      id: "1",
    });
  });

  it("indexes an array with a numeric segment, as a from path does", () => {
    const record = {
      groups: [{ title: "Chad", name: "tcd" }, { title: "Mali" }],
    };

    expect(omitRecordPaths(record, ["groups.0.title"])).toEqual({
      groups: [{ name: "tcd" }, { title: "Mali" }],
    });
  });

  it("ignores a path that is missing or runs through a primitive", () => {
    const record = { title: "Population", tags: ["a"] };

    expect(
      omitRecordPaths(record, ["missing", "title.length", "tags.name"]),
    ).toEqual(record);
  });

  it("does not change the record it was given", () => {
    const record = { notes: "About.", organization: { title: "WorldPop" } };

    omitRecordPaths(record, ["notes", "organization.title"]);

    expect(record).toEqual({
      notes: "About.",
      organization: { title: "WorldPop" },
    });
  });

  it("returns a record that is not an object as it is", () => {
    expect(omitRecordPaths("text", ["a"])).toBe("text");
    expect(omitRecordPaths(null, ["a"])).toBeNull();
  });
});
