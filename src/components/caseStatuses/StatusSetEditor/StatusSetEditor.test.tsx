/*
 * The status set editor is controlled, so these tests render it inside a
 * small stateful harness that feeds every change back in, the way the
 * create form and the Edit statuses modal do.
 */
import { Model } from "@avandar/models";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

const ACTIVE_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const INACTIVE_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;

const ACTIVE: ConceptStatus.Draft = {
  id: ACTIVE_ID,
  name: "Active",
  description: "Open and being worked on.",
  color: "#40c057",
};
const INACTIVE: ConceptStatus.Draft = {
  id: INACTIVE_ID,
  name: "Inactive",
  description: "No longer being worked on.",
  color: "#637c95",
};
const DEFAULT_SET: ConceptStatus.SetValue = {
  statuses: [ACTIVE, INACTIVE],
  defaultStatusId: ACTIVE_ID,
};

type HarnessProps = {
  initialValue: ConceptStatus.SetValue;
  savedStatuses?: readonly ConceptStatus.T[];
  recordCounts?: Partial<Record<ConceptStatus.Id, number>>;
  onValueChange?: (value: ConceptStatus.SetValue) => void;
  onReplacementsChange?: (replacements: StatusReplacements) => void;
};

function StatusSetEditorHarness(props: Readonly<HarnessProps>): ReactNode {
  const [value, setValue] = useState(props.initialValue);
  const [replacements, setReplacements] = useState<StatusReplacements>({});
  return (
    <StatusSetEditor
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        props.onValueChange?.(nextValue);
      }}
      savedStatuses={props.savedStatuses}
      recordCounts={props.recordCounts}
      replacements={replacements}
      onReplacementsChange={(nextReplacements) => {
        setReplacements(nextReplacements);
        props.onReplacementsChange?.(nextReplacements);
      }}
    />
  );
}

function _getLastValue(
  onValueChange: ReturnType<typeof vi.fn>,
): ConceptStatus.SetValue {
  return onValueChange.mock.lastCall?.[0] as ConceptStatus.SetValue;
}

describe("StatusSetEditor", () => {
  it("labels the default radio group and names each row's controls after its status", () => {
    render(<StatusSetEditorHarness initialValue={DEFAULT_SET} />);

    expect(
      screen.getByRole("radiogroup", { name: "Default status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reorder Active" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Active color: Green" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Inactive" }),
    ).toBeInTheDocument();
  });

  it("adds a status in the first palette color the set does not use yet", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add status" }));

    const added = _getLastValue(onValueChange).statuses[2];
    expect(added?.name).toBe("");
    expect(added?.color).toBe("#228be6");
  });

  it("asks for a name on a status whose name is blank", () => {
    render(<StatusSetEditorHarness initialValue={DEFAULT_SET} />);

    fireEvent.click(screen.getByRole("button", { name: "Add status" }));

    expect(screen.getByText("Enter a name.")).toBeInTheDocument();
  });

  it("flags a status whose name repeats another one in a different case", () => {
    render(
      <StatusSetEditorHarness
        initialValue={{
          statuses: [ACTIVE, { ...INACTIVE, name: "active" }],
          defaultStatusId: ACTIVE_ID,
        }}
      />,
    );

    expect(
      screen.getAllByText("Another status has this name.").length,
    ).toBeGreaterThan(0);
  });

  it("makes the chosen status the default", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    );

    expect(_getLastValue(onValueChange).defaultStatusId).toBe(INACTIVE_ID);
    expect(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    ).toBeChecked();
  });

  it("moves the default to the first remaining status when the default is removed", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Active" }));

    expect(_getLastValue(onValueChange).defaultStatusId).toBe(INACTIVE_ID);
    expect(
      screen.getByRole("radio", { name: "Make Inactive the default" }),
    ).toBeChecked();
  });

  it("asks for at least one status once every status is removed", () => {
    render(<StatusSetEditorHarness initialValue={DEFAULT_SET} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Active" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));

    expect(screen.getByText("Add at least one status.")).toBeInTheDocument();
  });

  it("moves a status down one place with Alt and the down arrow on its reorder handle", () => {
    const onValueChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Active" }), {
      key: "ArrowDown",
      altKey: true,
    });

    expect(
      _getLastValue(onValueChange).statuses.map((status) => {
        return status.id;
      }),
    ).toEqual([INACTIVE_ID, ACTIVE_ID]);
  });
});

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000e1" as Workspace.Id;

function _makeSavedStatus(
  draft: ConceptStatus.Draft,
  position: number,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: draft.id,
    workspaceId: WORKSPACE_ID,
    conceptId: CONCEPT_ID,
    name: draft.name,
    description: draft.description,
    color: draft.color,
    position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SAVED_STATUSES = [
  _makeSavedStatus(ACTIVE, 0),
  _makeSavedStatus(INACTIVE, 1),
];

describe("StatusSetEditor in edit mode", () => {
  it("asks where a removed status's records go", () => {
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        savedStatuses={SAVED_STATUSES}
        recordCounts={{ [INACTIVE_ID]: 2 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));

    expect(
      screen.getByRole("combobox", { name: "Move 2 records to" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose a status for these records."),
    ).toBeInTheDocument();
  });

  it("records the status chosen for a removed status's records", () => {
    const onReplacementsChange = vi.fn();
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        savedStatuses={SAVED_STATUSES}
        recordCounts={{ [INACTIVE_ID]: 2 }}
        onReplacementsChange={onReplacementsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));
    pickMantineSelectOption("Move 2 records to", "Active");

    expect(onReplacementsChange).toHaveBeenLastCalledWith({
      [INACTIVE_ID]: ACTIVE_ID,
    });
    expect(screen.queryByText("Choose a status for these records.")).toBeNull();
  });

  it("drops a removed status that has no records without asking", () => {
    render(
      <StatusSetEditorHarness
        initialValue={DEFAULT_SET}
        savedStatuses={SAVED_STATUSES}
        recordCounts={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));

    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
