import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { fireEvent, render, screen } from "@/test-utils";
import { CaseDetailsRail } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** Returns the tag names directly inside the rail's fact list. */
function getFactListChildTags(container: HTMLElement): string[] {
  const factList = container.querySelector("dl");
  return [...(factList?.children ?? [])].map((child) => {
    return child.tagName;
  });
}

describe("CaseDetailsRail", () => {
  it("lists each field with its value and every dataset it reads, and never shows internal ids", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Borough",
            value: "Brooklyn",
            sourceNames: ["Lab results", "Measles line list"],
          },
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "MMR status",
            value: "Unknown",
            sourceNames: [],
          },
        ]}
      />,
    );
    expect(screen.getByText("Borough")).toBeInTheDocument();
    expect(screen.getByText("Brooklyn")).toBeInTheDocument();
    expect(screen.getByText("Lab results")).toBeInTheDocument();
    expect(screen.getByText("Measles line list")).toBeInTheDocument();
    expect(
      screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/),
    ).not.toBeInTheDocument();
  });

  // A field with nothing to show must say so in words. Printing `null` reads
  // as a value.
  it("says a field has no value instead of printing null", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Notes",
            value: null,
            sourceNames: [],
          },
        ]}
      />,
    );
    expect(screen.getByText("No value")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("says so when the record has no fields, outside the fact list", () => {
    const { container } = render(<CaseDetailsRail attributes={[]} />);
    expect(screen.getByText("No fields yet")).toBeInTheDocument();
    expect(screen.getByText("No fields yet").closest("dl")).toBeNull();
    expect(getFactListChildTags(container)).toEqual([]);
  });

  it("shows placeholder rows outside the fact list while fields load", () => {
    const { container } = render(<CaseDetailsRail attributes={undefined} />);
    expect(
      screen.getByRole("heading", { name: "Details" }),
    ).toBeInTheDocument();
    const skeletons = container.querySelectorAll(".mantine-Skeleton-root");
    expect(skeletons.length).toBeGreaterThan(0);
    for (const skeleton of skeletons) {
      expect(skeleton.closest("dl")).toBeNull();
    }
    expect(container.querySelector(".mantine-Loader-root")).toBeNull();
  });

  // A failed load must end the loading state. Placeholders that never resolve
  // read as "still loading" forever.
  it("replaces the placeholder rows with the load failure when fields fail to load", () => {
    const { container } = render(
      <CaseDetailsRail
        attributes={undefined}
        loadError={{ isRetrying: false, onRetry: vi.fn() }}
      />,
    );
    expect(
      screen.getByText("This record's fields failed to load"),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".mantine-Skeleton-root")).toHaveLength(
      0,
    );
  });

  it("tries the load again from the failure's button", () => {
    const onRetry = vi.fn();
    render(
      <CaseDetailsRail
        attributes={undefined}
        loadError={{ isRetrying: false, onRetry }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
