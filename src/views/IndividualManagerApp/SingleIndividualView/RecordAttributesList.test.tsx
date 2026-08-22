import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { RecordAttributesList } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";

describe("RecordAttributesList", () => {
  it("renders named field values and never dumps internal ids", () => {
    render(
      <RecordAttributesList
        attributes={[
          {
            name: "County name",
            value: "Jackson",
            sourceName: "Counties.csv",
            sourceType: "csv_file",
          },
        ]}
      />,
    );

    expect(screen.getByText("County name")).toBeInTheDocument();
    expect(screen.getByText("Jackson")).toBeInTheDocument();
    expect(screen.getByText(/Counties\.csv/)).toBeInTheDocument();
    expect(screen.queryByText(/workspaceId/i)).toBeNull();
    expect(screen.queryByText(/externalId/i)).toBeNull();
  });

  it("explains when the record has no fields", () => {
    render(<RecordAttributesList attributes={[]} />);

    expect(screen.getByText("No fields yet")).toBeInTheDocument();
  });
});
