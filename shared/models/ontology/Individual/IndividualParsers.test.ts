import { describe, expect, it } from "vitest";
import { IndividualParsers } from "$/models/ontology/Individual/Individual.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

describe("IndividualParsers", () => {
  it("reads status_id into statusId", () => {
    const dbRow: Individual.T<"DBRead"> = {
      assigned_to: null,
      concept_id: "00000000-0000-4000-8000-000000000002",
      created_at: "2026-10-25T00:00:00.000Z",
      external_id: "ext-1",
      id: "00000000-0000-4000-8000-000000000001",
      missing_from_source_at: null,
      name: "Record one",
      status_id: "00000000-0000-4000-8000-000000000004",
      updated_at: "2026-10-25T00:00:00.000Z",
      workspace_id: "00000000-0000-4000-8000-000000000003",
    };

    expect(IndividualParsers.fromDBReadToModelRead(dbRow).statusId).toBe(
      "00000000-0000-4000-8000-000000000004",
    );
  });

  it("sends no status_id when the caller names no status, so the default applies", () => {
    const dbInsert = IndividualParsers.fromModelInsertToDBInsert({
      workspaceId: "00000000-0000-4000-8000-000000000003" as Workspace.Id,
      conceptId: "00000000-0000-4000-8000-000000000002" as Concept.Id,
      externalId: "ext-1",
      name: "Record one",
    });

    expect(dbInsert).not.toHaveProperty("status_id");
  });
});
