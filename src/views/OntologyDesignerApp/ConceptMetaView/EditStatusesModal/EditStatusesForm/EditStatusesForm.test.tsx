import { Model } from "@avandar/models";
import { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { EditStatusesForm } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/EditStatusesForm";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const ACTIVE_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const INACTIVE_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;

function _makeStatus(
  options: Readonly<{
    id: ConceptStatus.Id;
    name: string;
    color: string;
    position: number;
  }>,
): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: options.id,
    workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
    conceptId: CONCEPT_ID,
    name: options.name,
    description: undefined,
    color: options.color,
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const SAVED_STATUSES = [
  _makeStatus({ id: ACTIVE_ID, name: "Active", color: "#40c057", position: 0 }),
  _makeStatus({
    id: INACTIVE_ID,
    name: "Inactive",
    color: "#637c95",
    position: 1,
  }),
];

function _renderForm(
  options: Readonly<{
    onSave?: (payload: ConceptStatus.SavePayload) => void;
    saveError?: unknown;
  }> = {},
): void {
  render(
    <EditStatusesForm
      conceptId={CONCEPT_ID}
      savedStatuses={SAVED_STATUSES}
      defaultStatusId={ACTIVE_ID}
      recordCounts={{ [INACTIVE_ID]: 2 }}
      isSaving={false}
      saveError={options.saveError}
      onCancel={vi.fn()}
      onSave={options.onSave ?? vi.fn()}
    />,
  );
}

describe("EditStatusesForm", () => {
  it("saves only once a removed status's records have somewhere to go", () => {
    const onSave = vi.fn();
    _renderForm({ onSave });

    fireEvent.click(screen.getByRole("button", { name: "Remove Inactive" }));
    expect(
      screen.getByRole("button", { name: "Save statuses" }),
    ).toBeDisabled();

    pickMantineSelectOption("Move 2 records to", "Active");
    fireEvent.click(screen.getByRole("button", { name: "Save statuses" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: CONCEPT_ID,
        defaultStatusId: ACTIVE_ID,
        replacements: { [INACTIVE_ID]: ACTIVE_ID },
      }),
    );
  });

  it("warns that saved filters stop matching a renamed status", () => {
    _renderForm();

    const [activeName] = screen.getAllByRole("textbox", {
      name: "Status name",
    });
    fireEvent.change(activeName!, { target: { value: "Open" } });

    expect(screen.getByText(/find records by status name/)).toBeInTheDocument();
  });

  it("explains a refused save without showing the database's message", () => {
    _renderForm({
      saveError: new PostgrestError({
        message: "duplicate key value violates unique constraint",
        details: "",
        hint: "status_names_not_unique",
        code: "P0001",
      }),
    });

    expect(
      screen.getByText(
        "Two statuses have the same name. Give each one its own name.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key/)).toBeNull();
  });
});
