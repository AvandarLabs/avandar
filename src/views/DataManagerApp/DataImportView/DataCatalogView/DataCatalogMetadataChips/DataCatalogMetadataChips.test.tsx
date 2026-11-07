import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataCatalogMetadataChips } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogMetadataChips/DataCatalogMetadataChips";

const KEYWORDS = ["fhv", "for hire", "taxi", "drivers", "active"];

function _getActionLabel(keyword: string): string {
  return `Show datasets tagged ${keyword}`;
}

describe("DataCatalogMetadataChips", () => {
  it("calls onSelect with the clicked chip's value", () => {
    const onSelect = vi.fn();
    render(
      <DataCatalogMetadataChips
        values={KEYWORDS}
        getActionLabel={_getActionLabel}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Show datasets tagged taxi" }),
    );

    expect(onSelect).toHaveBeenCalledWith("taxi");
  });

  it("shows only the first values when a limit is set", () => {
    render(
      <DataCatalogMetadataChips
        values={KEYWORDS}
        numVisible={2}
        getActionLabel={_getActionLabel}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Show datasets tagged taxi" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+3 more" })).toBeInTheDocument();
  });

  it("shows every value once the more button is clicked", () => {
    render(
      <DataCatalogMetadataChips
        values={KEYWORDS}
        numVisible={2}
        getActionLabel={_getActionLabel}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+3 more" }));

    expect(
      screen.getByRole("button", { name: "Show datasets tagged active" }),
    ).toBeInTheDocument();
  });

  it("offers no more button when every value fits", () => {
    render(
      <DataCatalogMetadataChips
        values={KEYWORDS}
        numVisible={5}
        getActionLabel={_getActionLabel}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /more/ }),
    ).not.toBeInTheDocument();
  });
});
