import { findRetiredScopes } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/findRetiredScopes";
import { describe, expect, it } from "vitest";

const HDX = "https://data.humdata.org";
const OLD_DRIVE = "https://retired.invalid";

describe("findRetiredScopes", () => {
  it("finds stored pairs the pipeline no longer declares, including a removed drive's", () => {
    expect(
      findRetiredScopes({
        stored: [
          { drive_key: HDX, scope_key: "format:csv" },
          { drive_key: HDX, scope_key: "format:parquet" },
          { drive_key: OLD_DRIVE, scope_key: "all" },
        ],
        live: [{ driveKey: HDX, scopeKeys: ["format:csv"] }],
        scopeKey: undefined,
      }),
    ).toEqual([
      { driveKey: HDX, scopeKey: "format:parquet" },
      { driveKey: OLD_DRIVE, scopeKey: "all" },
    ]);
  });

  it("keeps only the named scope when one is given", () => {
    expect(
      findRetiredScopes({
        stored: [
          { drive_key: HDX, scope_key: "format:parquet" },
          { drive_key: OLD_DRIVE, scope_key: "all" },
        ],
        live: [{ driveKey: HDX, scopeKeys: ["format:csv"] }],
        scopeKey: "all",
      }),
    ).toEqual([{ driveKey: OLD_DRIVE, scopeKey: "all" }]);
  });

  it("finds nothing when every stored pair is live", () => {
    expect(
      findRetiredScopes({
        stored: [{ drive_key: HDX, scope_key: "format:csv" }],
        live: [{ driveKey: HDX, scopeKeys: ["format:csv", "format:parquet"] }],
        scopeKey: undefined,
      }),
    ).toEqual([]);
  });
});
