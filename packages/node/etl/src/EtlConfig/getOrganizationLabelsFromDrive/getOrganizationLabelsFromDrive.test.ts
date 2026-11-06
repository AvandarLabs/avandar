import { getOrganizationLabelsFromDrive } from "@etl/EtlConfig/getOrganizationLabelsFromDrive/getOrganizationLabelsFromDrive";
import { describe, expect, it } from "vitest";

const CONFIG = {
  organizationLabels: { 1: "City", 2: "Agency" },
  drives: [],
};

describe("getOrganizationLabelsFromDrive", () => {
  it("gives a drive with no labels the pipeline's", () => {
    expect(
      getOrganizationLabelsFromDrive({
        config: CONFIG,
        drive: { baseUrl: "https://a.example.gov" },
      }),
    ).toEqual({ 1: "City", 2: "Agency" });
  });

  it("replaces the pipeline's labels whole, not level by level", () => {
    expect(
      getOrganizationLabelsFromDrive({
        config: CONFIG,
        drive: { baseUrl: "https://a.example.gov", organizationLabels: { 1: "State" } },
      }),
    ).toEqual({ 1: "State" });
  });

  it("gives no labels when neither sets any", () => {
    expect(
      getOrganizationLabelsFromDrive({
        config: { drives: [] },
        drive: { baseUrl: "https://a.example.gov" },
      }),
    ).toEqual({});
  });
});
