import { describe, expect, it } from "vitest";
import { getSourceHost } from "@/views/DataManagerApp/DataImportView/DataCatalogView/getSourceHost/getSourceHost";

describe("getSourceHost", () => {
  it("returns the host of a URL without its path", () => {
    expect(
      getSourceHost("https://data.cityofnewyork.us/Transportation/abc-123"),
    ).toBe("data.cityofnewyork.us");
  });

  it("drops a leading www.", () => {
    expect(getSourceHost("https://www.worldbank.org/en/home")).toBe(
      "worldbank.org",
    );
  });

  it("returns the input unchanged when it is not a URL", () => {
    expect(getSourceHost("not a url")).toBe("not a url");
  });
});
