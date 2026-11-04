import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@/test-utils";
import { CaseTypeStatusList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusList/CaseTypeStatusList";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";

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
    color: "#40c057",
    position: options.position,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
  });
}

const ACTIVE = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Active",
  description: "Open and being worked on.",
  position: 0,
});
const INACTIVE = _makeStatus({
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "Inactive",
  description: "No longer being worked on.",
  position: 1,
});

describe("CaseTypeStatusList", () => {
  it("marks the default status and counts the records in each status", () => {
    render(
      <CaseTypeStatusList
        statuses={[ACTIVE, INACTIVE]}
        defaultStatusId={ACTIVE.id}
        recordCounts={{ [ACTIVE.id]: 3 }}
      />,
    );

    const rows = within(
      screen.getByRole("list", { name: "Statuses" }),
    ).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Default");
    expect(rows[0]).toHaveTextContent("3 records");
    expect(rows[1]).not.toHaveTextContent("Default");
    expect(rows[1]).toHaveTextContent("0 records");
  });

  it("shows what each status means", () => {
    render(
      <CaseTypeStatusList
        statuses={[ACTIVE, INACTIVE]}
        defaultStatusId={ACTIVE.id}
        recordCounts={undefined}
      />,
    );

    expect(screen.getByText("Open and being worked on.")).toBeInTheDocument();
    expect(screen.getByText("No longer being worked on.")).toBeInTheDocument();
  });
});
