import { describe, expect, it } from "vitest";
import { createPackageDirToName } from "./createPackageDirToName";

describe("createPackageDirToName", () => {
  it("maps each package directory to its package name", () => {
    const result = createPackageDirToName([
      {
        packageDir: "packages/web/ui",
        packageJson: { name: "@avandar/ui" },
      },
      {
        packageDir: "packages/shared/utils",
        packageJson: { name: "@avandar/utils", private: false },
      },
    ]);
    expect([...result]).toEqual([
      ["packages/web/ui", "@avandar/ui"],
      ["packages/shared/utils", "@avandar/utils"],
    ]);
  });

  it("excludes private packages", () => {
    const result = createPackageDirToName([
      {
        packageDir: "packages/web/ui",
        packageJson: { name: "@avandar/ui" },
      },
      {
        packageDir: "packages/shared/plugin-manifest",
        packageJson: { name: "@avandar/plugin-manifest", private: true },
      },
    ]);
    expect([...result]).toEqual([["packages/web/ui", "@avandar/ui"]]);
  });

  it("returns an empty map when every package is private", () => {
    const result = createPackageDirToName([
      {
        packageDir: "packages/web/plugin-sdk",
        packageJson: { name: "@avandar/plugin-sdk", private: true },
      },
    ]);
    expect(result.size).toBe(0);
  });
});
