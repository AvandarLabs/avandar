import { HDX_BASE_URL, listHdxDrives } from "@pipelines/hdx/hdxDrive";
import { describe, expect, it } from "vitest";

describe("listHdxDrives", () => {
  it("resolves the drive's labels", () => {
    expect(
      listHdxDrives({
        organizationLabels: { 1: "Organization" },
        fields: { organization1_name: { value: "X" } },
        drives: [{ baseUrl: HDX_BASE_URL }],
      }),
    ).toEqual([
      { baseUrl: HDX_BASE_URL, organizationLabels: { 1: "Organization" } },
    ]);
  });

  it("lists no drive when the config lists none", () => {
    expect(listHdxDrives({ drives: [] })).toEqual([]);
  });

  it("refuses more than one drive", () => {
    expect(() => {
      return listHdxDrives({
        drives: [{ baseUrl: HDX_BASE_URL }, { baseUrl: HDX_BASE_URL }],
      });
    }).toThrow("more than one drive");
  });

  it("refuses a drive that is not HDX", () => {
    expect(() => {
      return listHdxDrives({ drives: [{ baseUrl: "https://other.example" }] });
    }).toThrow(`must be ${HDX_BASE_URL}`);
  });

  it("refuses a drive with scopes", () => {
    expect(() => {
      return listHdxDrives({
        drives: [{ baseUrl: HDX_BASE_URL, scopes: [{ key: "x" }] }],
      });
    }).toThrow("cannot set scopes");
  });
});
