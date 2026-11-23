import { describe, expect, it } from "vitest";
import { DatasetPreviewSection } from "@/components/DatasetPreviewSection/DatasetPreviewSection";
import { render, screen } from "@/test-utils";

const ROWS = [{ country: "Chad" }, { country: "Niger" }];

describe("DatasetPreviewSection", () => {
  it("says the preview holds only the first rows when it reached the cap", () => {
    render(
      <DatasetPreviewSection
        columnNames={["country"]}
        rows={ROWS}
        maxPreviewRows={2}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Data preview")).toBeInTheDocument();
    expect(screen.getByText("First 2 rows")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This preview shows only the first 2 rows of the dataset.",
      ),
    ).toBeInTheDocument();
  });

  it("does not claim there are more rows when the preview holds them all", () => {
    render(
      <DatasetPreviewSection
        columnNames={["country"]}
        rows={ROWS}
        maxPreviewRows={200}
        isLoading={false}
      />,
    );

    expect(screen.getByText("First 2 rows")).toBeInTheDocument();
    expect(screen.queryByText(/shows only the first/)).toBeNull();
  });

  it("says when the preview could not be loaded", () => {
    render(
      <DatasetPreviewSection
        columnNames={[]}
        rows={undefined}
        maxPreviewRows={200}
        isLoading={false}
        isError
      />,
    );

    expect(
      screen.getByText("We couldn't load a preview of this dataset."),
    ).toBeInTheDocument();
  });
});
