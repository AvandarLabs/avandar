import { HDX_SCOPES } from "@pipelines/hdx/hdxScopes";
import { describe, expect, it } from "vitest";
import { READABLE_FORMATS } from "$/connectors/open-data/getCkanResourceFromPackage";

describe("HDX_SCOPES", () => {
  it("keeps the keys the scope seed migration names", () => {
    // The migration *_seed_pipeline_scope_keys_and_checkpoints.sql seeded
    // checkpoints and listing keys under exactly these keys. Renaming one
    // starts that format's crawl over from the beginning.
    expect(
      HDX_SCOPES.map((scope) => {
        return scope.key;
      }),
    ).toEqual(["format:csv", "format:parquet", "format:other"]);
  });

  it("names only formats the open data reader can read", () => {
    expect(
      HDX_SCOPES.every((scope) => {
        return (
          scope.resourceFormat === undefined ||
          READABLE_FORMATS.includes(scope.resourceFormat.toLowerCase())
        );
      }),
    ).toBe(true);
  });

  it("covers every other format in one scope, so no resource is left out", () => {
    const formatScopeFormats = HDX_SCOPES.flatMap((scope) => {
      return scope.resourceFormat === undefined ? [] : [scope.resourceFormat];
    });
    const otherScope = HDX_SCOPES.find((scope) => {
      return scope.resourceFormat === undefined;
    });

    expect(otherScope?.excludedFormats).toEqual(formatScopeFormats);
  });
});
