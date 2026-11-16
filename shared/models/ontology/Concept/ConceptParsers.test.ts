import { describe, expect, it } from "vitest";
import { ConceptParsers } from "$/models/ontology/Concept/Concept.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";

describe("ConceptParsers", () => {
  it("reads default_status_id into defaultStatusId", () => {
    const dbRow: Concept.T<"DBRead"> = {
      allow_manual_creation: false,
      created_at: "2026-10-25T00:00:00.000Z",
      default_status_id: "00000000-0000-4000-8000-000000000004",
      description: null,
      id: "00000000-0000-4000-8000-000000000001",
      name: "Cholera case",
      owner_id: "00000000-0000-4000-8000-000000000002",
      updated_at: "2026-10-25T00:00:00.000Z",
      workspace_id: "00000000-0000-4000-8000-000000000003",
    };

    expect(ConceptParsers.fromDBReadToModelRead(dbRow).defaultStatusId).toBe(
      "00000000-0000-4000-8000-000000000004",
    );
  });
});
