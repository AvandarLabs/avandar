import { assertValidScopeKeys } from "@etl/EtlEngine/assertValidScopeKeys/assertValidScopeKeys";
import { describe, expect, it } from "vitest";

const DRIVE_KEY = "https://data.humdata.org";

describe("assertValidScopeKeys", () => {
  it.each([
    ["all"],
    ["format:csv"],
    ["format:csv@2"],
    ["category.health-v_1"],
    ["a".repeat(64)],
  ])("accepts %s", (scopeKey) => {
    expect(() => {
      assertValidScopeKeys({ driveKey: DRIVE_KEY, scopeKeys: [scopeKey] });
    }).not.toThrow();
  });

  it.each([
    [""],
    ["Format:CSV"],
    ["format,csv"],
    ["{all}"],
    ['"all"'],
    ["-all"],
    ["a".repeat(65)],
  ])("rejects %j, naming the drive", (scopeKey) => {
    expect(() => {
      assertValidScopeKeys({ driveKey: DRIVE_KEY, scopeKeys: [scopeKey] });
    }).toThrow(`Drive ${DRIVE_KEY} declares the scope key`);
  });

  it("rejects a key declared twice", () => {
    expect(() => {
      assertValidScopeKeys({
        driveKey: DRIVE_KEY,
        scopeKeys: ["format:csv", "format:csv"],
      });
    }).toThrow("declares the scope key format:csv more than once");
  });

  it("rejects a drive that declares no scopes", () => {
    expect(() => {
      assertValidScopeKeys({ driveKey: DRIVE_KEY, scopeKeys: [] });
    }).toThrow(`Drive ${DRIVE_KEY} declares no scopes`);
  });
});
