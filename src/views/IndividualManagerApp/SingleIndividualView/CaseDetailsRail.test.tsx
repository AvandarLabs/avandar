import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { render, screen } from "@/test-utils";
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
  it("lists each field with its value and source, and never shows internal ids", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "Borough",
            value: "Brooklyn",
            sourceName: "Measles line list",
          },
          {
            id: uuid<ConceptAttribute.Id>(),
            name: "MMR status",
            value: "Unknown",
          },
        ]}
      />,
    );
    expect(screen.getByText("Borough")).toBeInTheDocument();
    expect(screen.getByText("Brooklyn")).toBeInTheDocument();
    expect(screen.getByText("Measles line list")).toBeInTheDocument();
    expect(
      screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/),
    ).not.toBeInTheDocument();
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
});
