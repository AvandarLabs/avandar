import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { DataCatalogInvalidNotice } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogInvalidNotice/DataCatalogInvalidNotice";

describe("DataCatalogInvalidNotice", () => {
  it("says where the dataset is indexed, that it cannot be loaded, and why", () => {
    render(
      <DataCatalogInvalidNotice
        serviceName="Humanitarian Data Exchange"
        reason="empty_dataset"
      />,
    );

    expect([
      screen.getByText(
        "This dataset is indexed in Humanitarian Data Exchange, but it can't be loaded.",
      ),
      screen.getByText("The source file is empty."),
    ]).toHaveLength(2);
  });

  it("says the problem may be temporary when the file's host did not answer", () => {
    render(
      <DataCatalogInvalidNotice
        serviceName="Humanitarian Data Exchange"
        reason="unreachable_dataset"
      />,
    );

    expect(
      screen.getByText(
        "The site that hosts the file didn't respond. This may be temporary.",
      ),
    ).toBeInTheDocument();
  });
});
