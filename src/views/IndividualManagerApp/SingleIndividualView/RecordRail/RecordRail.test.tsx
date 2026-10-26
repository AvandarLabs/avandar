import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { RecordRail } from "@/views/IndividualManagerApp/SingleIndividualView/RecordRail/RecordRail";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000e1" as Workspace.Id;
const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const STATUS_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;

const CONCEPT: Concept.T = Model.make("Concept", {
  id: CONCEPT_ID,
  workspaceId: WORKSPACE_ID,
  ownerId: "00000000-0000-4000-8000-0000000000f1" as User.Id,
  name: "Cholera case",
  description: undefined,
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
  allowManualCreation: false,
  defaultStatusId: STATUS_ID,
});

const RECORD: Individual.T = {
  assignedTo: undefined,
  conceptId: CONCEPT_ID,
  createdAt: "2026-10-20T12:00:00.000Z",
  externalId: "CH-0001",
  id: "00000000-0000-4000-8000-0000000000d1" as Individual.Id,
  missingFromSourceAt: undefined,
  name: "Case 001",
  statusId: STATUS_ID,
  updatedAt: "2026-10-24T12:00:00.000Z",
  workspaceId: WORKSPACE_ID,
};

describe("RecordRail", () => {
  it("omits the missing-from-source fact while the record is still in its source", () => {
    render(<RecordRail concept={CONCEPT} individual={RECORD} />);

    expect(screen.getByText("CH-0001")).toBeInTheDocument();
    expect(screen.queryByText("Missing from source since")).toBeNull();
  });

  it("shows the day the record went missing from its source", () => {
    render(
      <RecordRail
        concept={CONCEPT}
        individual={{
          ...RECORD,
          missingFromSourceAt: "2026-10-25T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Missing from source since")).toBeInTheDocument();
    expect(screen.getByText("Oct 25, 2026")).toBeInTheDocument();
  });
});
