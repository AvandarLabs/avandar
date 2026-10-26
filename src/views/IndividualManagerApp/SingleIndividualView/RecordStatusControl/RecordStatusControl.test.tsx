import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { RecordStatusControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

const SUSPECTED_DESCRIPTION = "Reported but not yet tested.";
const CONFIRMED_DESCRIPTION = "A lab test came back positive.";

function _makeStatus(
  options: Readonly<{
    id: string;
    name: string;
    description: string;
    position: number;
  }>,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: options.id as ConceptStatus.Id,
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
    conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
    name: options.name,
    description: options.description,
    color: "#fab005",
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SUSPECTED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Suspected",
  description: SUSPECTED_DESCRIPTION,
  position: 0,
});
const CONFIRMED = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "Confirmed",
  description: CONFIRMED_DESCRIPTION,
  position: 1,
});
const STATUSES = [SUSPECTED, CONFIRMED];

function _expectInTooltip(text: string): void {
  expect(screen.getByText(text).closest("[role='tooltip']")).not.toBeNull();
}

describe("RecordStatusControl", () => {
  it("reports the status picked from the status menu", async () => {
    const onChange = vi.fn();
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status: Suspected" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Confirmed" }));

    expect(onChange).toHaveBeenCalledWith(CONFIRMED.id);
  });

  it("shows what a status means when its menu option has focus", async () => {
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status: Suspected" }));
    const confirmedOption = await screen.findByRole("menuitem", {
      name: "Confirmed",
    });
    act(() => {
      confirmedOption.focus();
    });

    await waitFor(() => {
      _expectInTooltip(CONFIRMED_DESCRIPTION);
    });
  });

  it("shows what the current status means when the status button has focus", async () => {
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit
        onChange={vi.fn()}
      />,
    );

    act(() => {
      screen.getByRole("button", { name: "Status: Suspected" }).focus();
    });

    await waitFor(() => {
      _expectInTooltip(SUSPECTED_DESCRIPTION);
    });
  });

  it("keeps the status menu closed while a change is being saved", () => {
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit
        isSaving
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Status: Suspected" });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("menuitem", { name: "Confirmed" })).toBeNull();
  });

  it("shows a badge and no status menu to a user who cannot change statuses", () => {
    render(
      <RecordStatusControl
        statuses={STATUSES}
        currentStatusId={SUSPECTED.id}
        canEdit={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Suspected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Status:/ })).toBeNull();
  });
});
