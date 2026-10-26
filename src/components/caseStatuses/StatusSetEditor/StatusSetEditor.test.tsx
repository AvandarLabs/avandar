/*
 * The status set editor is controlled, so these tests render it inside a
 * small stateful harness that feeds every change back in, the way the
 * create form and the Edit statuses modal do.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import { fireEvent, render, screen } from "@/test-utils";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
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
