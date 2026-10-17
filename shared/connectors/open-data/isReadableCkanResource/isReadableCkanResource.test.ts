import { describe, expect, it } from "vitest";
import { isReadableCkanResource } from "$/connectors/open-data/isReadableCkanResource/isReadableCkanResource.ts";
import type { CkanResource } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

function _resource(overrides: Partial<CkanResource>): CkanResource {
  return {
    id: "9da55974-adf5-4106-988c-d3c92333ea0a",
    name: "data.csv",
    format: "CSV",
    url: "https://data.humdata.org/dataset/d/resource/r/download/data.csv",
    url_type: "upload",
    size: 235,
    hash: "32e316c0337f8a9b9117999a595f8e86",
    last_modified: "2026-08-18T08:44:07.360475",
    mimetype: undefined,
    datastore_active: false,
    ...overrides,
  };
}

describe("isReadableCkanResource", () => {
  it("accepts an uploaded CSV resource", () => {
    expect(
      isReadableCkanResource(_resource({ format: "CSV", url_type: "upload" })),
    ).toBe(true);
  });

  it("accepts an uploaded Parquet resource regardless of format casing", () => {
    expect(
      isReadableCkanResource(
        _resource({ format: "Parquet", url_type: "upload" }),
      ),
    ).toBe(true);
  });

  it("rejects a resource whose url_type is an upstream api link", () => {
    expect(
      isReadableCkanResource(_resource({ format: "CSV", url_type: "api" })),
    ).toBe(false);
  });

  it("rejects an uploaded resource in an unsupported format", () => {
    expect(
      isReadableCkanResource(_resource({ format: "TXT", url_type: "upload" })),
    ).toBe(false);
  });
});
