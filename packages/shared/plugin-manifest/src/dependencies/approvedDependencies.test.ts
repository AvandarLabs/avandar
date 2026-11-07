import { getUnapprovedDependenciesFromPackageJson } from "@plugin-manifest/dependencies/approvedDependencies.ts";
import { describe, expect, it } from "vitest";

describe("getUnapprovedDependenciesFromPackageJson", () => {
  it("returns only dependencies outside the approved list", () => {
    expect(
      getUnapprovedDependenciesFromPackageJson({
        dependencies: {
          "@avandar/plugin-sdk": "workspace:*",
          "simple-statistics": "^7.8.8",
          lodash: "^4.17.21",
        },
      }),
    ).toEqual(["lodash"]);
  });

  it("accepts a package.json with no dependencies", () => {
    expect(getUnapprovedDependenciesFromPackageJson({})).toEqual([]);
  });
});
