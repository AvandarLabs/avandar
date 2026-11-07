import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { StatusFilter } from "@/views/IndividualManagerApp/IndividualNavbar/StatusFilter/StatusFilter";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

function _makeStatus(
  options: Readonly<{ id: string; name: string; position: number }>,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: options.id as ConceptStatus.Id,
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
    conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
    name: options.name,
    description: undefined,
    color: "#228be6",
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SUSPECTED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Suspected",
  position: 0,
});
const CONFIRMED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "Confirmed",
  position: 1,
});

describe("StatusFilter", () => {
  it("reports the statuses picked in the filter", async () => {
    const onChange = vi.fn();
    render(
      <StatusFilter
        statuses={[SUSPECTED, CONFIRMED]}
        selectedStatusIds={[]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Confirmed" }));

    expect(onChange).toHaveBeenCalledWith([CONFIRMED.id]);
  });

  it("says every status shows while none is picked", () => {
    render(
      <StatusFilter
        statuses={[SUSPECTED, CONFIRMED]}
        selectedStatusIds={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("All statuses")).toBeInTheDocument();
  });
});
