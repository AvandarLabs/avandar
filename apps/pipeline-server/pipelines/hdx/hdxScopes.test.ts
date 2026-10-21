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
    ).toEqual(["format:csv", "format:parquet"]);
  });

  it("names only formats the open data reader can read", () => {
    expect(
      HDX_SCOPES.every((scope) => {
        return READABLE_FORMATS.includes(scope.resourceFormat.toLowerCase());
      }),
    ).toBe(true);
  });
});
