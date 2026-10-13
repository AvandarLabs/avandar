import { describe, expect, it } from "vitest";
import { changedFilesToPackageNames } from "./changedFilesToPackageNames";

describe("changedFilesToPackageNames", () => {
  const packageDirToName = new Map([
    ["packages/web/ui", "@avandar/ui"],
    ["packages/shared/utils", "@avandar/utils"],
  ]);

  it("maps files under one package directory to that package's name", () => {
    const result = changedFilesToPackageNames(
      [
        "packages/web/ui/src/Button.tsx",
        "packages/web/ui/src/Button.test.tsx",
      ],
      packageDirToName,
    );
    expect(result).toEqual(["@avandar/ui"]);
  });

  it("maps files under two different package directories to both names", () => {
    const result = changedFilesToPackageNames(
      [
        "packages/web/ui/src/Button.tsx",
        "packages/shared/utils/src/isDefined.ts",
      ],
      packageDirToName,
    );
    expect(result).toEqual(["@avandar/ui", "@avandar/utils"]);
  });

  it("ignores files outside packages/**", () => {
    const result = changedFilesToPackageNames(
      ["apps/web/src/App.tsx", "docs/readme.md"],
      packageDirToName,
    );
    expect(result).toEqual([]);
  });

  it("ignores a packages/** file whose directory has no known package name", () => {
    const result = changedFilesToPackageNames(
      ["packages/node/unlisted-package/src/index.ts"],
      packageDirToName,
    );
    expect(result).toEqual([]);
  });
});
