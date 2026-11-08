import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { fireEvent, render, screen, within } from "@/test-utils";
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
            dataType: "varchar",
            value: "Brooklyn",
            sourceNames: ["Lab results", "Measles line list"],
          },
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "MMR status",
            dataType: "varchar",
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

  it("names a field's source lines as its sources for assistive technology", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Borough",
            dataType: "varchar",
            value: "Brooklyn",
            sourceNames: ["Lab results", "Measles line list"],
          },
        ]}
      />,
    );

    expect(
      within(screen.getByRole("list", { name: "Sources" }))
        .getAllByRole("listitem")
        .map((item) => {
          return item.textContent;
        }),
    ).toEqual(["Lab results", "Measles line list"]);
  });

  it("lists no sources for a field that reads none", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Notes",
            dataType: "varchar",
            value: "Called twice",
            sourceNames: [],
          },
        ]}
      />,
    );

    expect(screen.queryByRole("list", { name: "Sources" })).toBeNull();
  });

  // The rail group's label is an h4, so the failure under it is an h5.
  it("titles the load failure below the rail group's heading", () => {
    render(
      <CaseDetailsRail
        attributes={undefined}
        loadError={{ isRetrying: false, onRetry: vi.fn() }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "This record's fields failed to load",
        level: 5,
      }),
    ).toBeInTheDocument();
  });

  it("shows a date field's value as a date", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Rash onset",
            dataType: "date",
            value: 1_709_596_800_000,
            sourceNames: [],
          },
        ]}
      />,
    );

    expect(screen.getByText("Mar 5, 2024")).toBeInTheDocument();
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
            dataType: "varchar",
            value: null,
            sourceNames: [],
          },
        ]}
      />,
    );
    expect(screen.getByText("No value")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("says a field has no value when its value is undefined", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Notes",
            dataType: "varchar",
            value: undefined,
            sourceNames: [],
          },
        ]}
      />,
    );
    expect(screen.getByText("No value")).toBeInTheDocument();
  });

  // Two datasets can share a name. Each still gets its own line, and React
  // must not see two siblings with the same key.
  it("lists two datasets that share a name on separate lines", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Borough",
            dataType: "varchar",
            value: "Brooklyn",
            sourceNames: ["Line list", "Line list"],
          },
        ]}
      />,
    );
    expect(screen.getAllByText("Line list")).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
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
