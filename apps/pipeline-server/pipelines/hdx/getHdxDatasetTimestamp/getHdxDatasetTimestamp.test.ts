import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import { describe, expect, it } from "vitest";

describe("getHdxDatasetTimestamp", () => {
  it("reads a dataset's metadata_modified as UTC", () => {
    expect(
      getHdxDatasetTimestamp({
        name: "a",
        metadata_modified: "2026-10-20T13:47:48.858245",
      }),
    ).toEqual(new Date("2026-10-20T13:47:48.858Z"));
  });

  it("throws for a dataset with no metadata_modified, which cannot be ordered", () => {
    expect(() => {
      return getHdxDatasetTimestamp({ name: "a", metadata_modified: undefined });
    }).toThrow("HDX dataset a has no metadata_modified");
  });
});
