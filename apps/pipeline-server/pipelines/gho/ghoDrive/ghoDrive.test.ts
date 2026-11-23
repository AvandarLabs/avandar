import { GHO_BASE_URL, listGhoDrives } from "@pipelines/gho/ghoDrive/ghoDrive";
import { describe, expect, it } from "vitest";

describe("listGhoDrives", () => {
  it("resolves the drive's labels", () => {
    expect(
      listGhoDrives({
        organizationLabels: { 1: "Organization", 2: "Collection" },
        drives: [{ baseUrl: GHO_BASE_URL }],
      }),
    ).toEqual([
      {
        baseUrl: GHO_BASE_URL,
        organizationLabels: { 1: "Organization", 2: "Collection" },
      },
    ]);
  });

  it("lists no drive when the config lists none", () => {
    expect(listGhoDrives({ drives: [] })).toEqual([]);
  });

  it("refuses more than one drive", () => {
    expect(() => {
      return listGhoDrives({
        drives: [{ baseUrl: GHO_BASE_URL }, { baseUrl: GHO_BASE_URL }],
      });
    }).toThrow("more than one drive");
  });

  it("refuses a drive that is not GHO's API", () => {
    expect(() => {
      return listGhoDrives({ drives: [{ baseUrl: "https://other.example" }] });
    }).toThrow(`must be ${GHO_BASE_URL}`);
  });

  it("refuses a drive with scopes", () => {
    expect(() => {
      return listGhoDrives({
        drives: [{ baseUrl: GHO_BASE_URL, scopes: [{ key: "x" }] }],
      });
    }).toThrow("cannot set scopes");
  });
});
