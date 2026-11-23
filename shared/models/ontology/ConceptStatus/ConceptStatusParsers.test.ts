import { describe, expect, it } from "vitest";
import { ConceptStatusParsers } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";

const DB_ROW: ConceptStatus.T<"DBRead"> = {
  color: "#40c057",
  concept_id: "00000000-0000-4000-8000-000000000002",
  created_at: "2026-10-25T00:00:00.000Z",
  description: null,
  id: "00000000-0000-4000-8000-000000000001",
  name: "Active",
  position: 0,
  updated_at: "2026-10-25T00:00:00.000Z",
  workspace_id: "00000000-0000-4000-8000-000000000003",
};

describe("ConceptStatusParsers", () => {
  it("reads a database row into a camel-cased ConceptStatus model", () => {
    const status = ConceptStatusParsers.fromDBReadToModelRead(DB_ROW);

    expect(status).toMatchObject({
      __type: "ConceptStatus",
      conceptId: DB_ROW.concept_id,
      workspaceId: DB_ROW.workspace_id,
      position: 0,
    });
  });

  it("reads a null description as undefined", () => {
    const status = ConceptStatusParsers.fromDBReadToModelRead(DB_ROW);

    expect(status.description).toBeUndefined();
  });

  it("writes an undefined description as null so an update can clear it", () => {
    const dbUpdate = ConceptStatusParsers.fromModelUpdateToDBUpdate({
      description: undefined,
    });

    expect(dbUpdate).toEqual({ description: null });
  });
});
