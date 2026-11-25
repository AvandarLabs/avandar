import { listConfiguredDrives } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { describe, expect, it } from "vitest";

describe("listConfiguredDrives", () => {
  it("resolves each drive's labels and passes its scopes through", () => {
    expect(
      listConfiguredDrives({
        organizationLabels: { 1: "City" },
        fields: { organization1_name: { value: "X" } },
        drives: [
          { baseUrl: "https://a.example.gov" },
          {
            baseUrl: "https://b.example.gov",
            organizationLabels: { 1: "State" },
            scopes: [{ key: "health", categories: ["Health"] }],
          },
        ],
      }),
    ).toEqual([
      { baseUrl: "https://a.example.gov", organizationLabels: { 1: "City" } },
      {
        baseUrl: "https://b.example.gov",
        organizationLabels: { 1: "State" },
        scopes: [{ key: "health", categories: ["Health"] }],
      },
    ]);
  });

  it("refuses scopes that are not Socrata scopes", () => {
    expect(() => {
      return listConfiguredDrives({
        drives: [{ baseUrl: "https://a.example.gov", scopes: [{ name: "x" }] }],
      });
    }).toThrow();
  });
});
