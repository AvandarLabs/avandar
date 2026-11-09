import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { DataCatalogUnsupportedNotice } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogUnsupportedNotice/DataCatalogUnsupportedNotice";

describe("DataCatalogUnsupportedNotice", () => {
  it("says Avandar can't add the dataset yet and links to the original", () => {
    render(
      <DataCatalogUnsupportedNotice
        serviceName="City of New York"
        sourceUrl="https://data.cityofnewyork.us/d/wnu3-egq7"
        hasNoRows={false}
      />,
    );

    expect([
      screen.getByText("Avandar can't add this kind of dataset yet."),
      screen
        .getByRole("link", { name: "Open it on City of New York" })
        .getAttribute("href"),
    ]).toEqual([
      expect.anything(),
      "https://data.cityofnewyork.us/d/wnu3-egq7",
    ]);
  });

  it("leaves out the link when the listing has no source page", () => {
    render(
      <DataCatalogUnsupportedNotice
        serviceName="City of New York"
        sourceUrl={undefined}
        hasNoRows={false}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says a dataset with no rows has no data yet, rather than that it is unsupported", () => {
    render(
      <DataCatalogUnsupportedNotice
        serviceName="World Health Organization"
        sourceUrl="https://ghoapi.azureedge.net/api/WHS3_62"
        hasNoRows
      />,
    );

    expect([
      screen.getByText("This dataset has no data yet"),
      screen.getByText(
        "The publisher has not added any rows to it. You can still open the original, where it is published.",
      ),
      screen.queryByText("Avandar can't add this kind of dataset yet."),
    ]).toEqual([expect.anything(), expect.anything(), null]);
  });
});
