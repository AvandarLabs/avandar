import { describe, expect, it } from "vitest";
import { buildOrganizationLine } from "@/views/DataManagerApp/DataImportView/DataCatalogView/buildOrganizationLine/buildOrganizationLine";

describe("buildOrganizationLine", () => {
  it("shows the two deepest of four levels, deepest first", () => {
    expect(
      buildOrganizationLine({
        organization1Name: "State of New York",
        organization2Name: "City of New York",
        organization3Name: "Taxi and Limousine Commission (TLC)",
        organization4Name: "Licensing Division",
      }),
    ).toBe("Licensing Division · Taxi and Limousine Commission (TLC)");
  });

  it("shows the only level when a listing has one", () => {
    expect(
      buildOrganizationLine({
        organization1Name: "World Bank",
        organization2Name: undefined,
        organization3Name: undefined,
        organization4Name: undefined,
      }),
    ).toBe("World Bank");
  });

  it("skips a missing middle level", () => {
    expect(
      buildOrganizationLine({
        organization1Name: "City of New York",
        organization2Name: undefined,
        organization3Name: "Taxi and Limousine Commission (TLC)",
        organization4Name: undefined,
      }),
    ).toBe("Taxi and Limousine Commission (TLC) · City of New York");
  });
});
