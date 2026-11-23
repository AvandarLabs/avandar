/**
 * A case type's status column has no database row, so its identity has to be
 * derived. These pin that the derivation is stable and per case type, which
 * is what lets a selected status column survive a reload.
 */
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { ConceptModule } from "$/models/ontology/Concept/ConceptModule.ts";
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";

const CHOLERA_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;
const MEASLES_ID = "dddddddd-4444-4444-8444-dddddddddddd" as Concept.Id;

describe("ConceptStatusColumn.fromConceptId", () => {
  it("gives a case type's status column the same typed id on every call", () => {
    const first = ConceptStatusColumn.fromConceptId(CHOLERA_ID);
    const second = ConceptStatusColumn.fromConceptId(CHOLERA_ID);

    expect(Model.getTypedId(first)).toEqual(Model.getTypedId(second));
    expect(Model.getTypedId(first)).toEqual({
      __type: "ConceptStatusColumn",
      id: CHOLERA_ID,
    });
  });

  it("gives two case types different status column ids", () => {
    expect(ConceptStatusColumn.fromConceptId(CHOLERA_ID).id).not.toBe(
      ConceptStatusColumn.fromConceptId(MEASLES_ID).id,
    );
  });
});

describe("ConceptStatusColumn.COLUMN_NAME", () => {
  it("is the name the case type module keeps for the status column", () => {
    expect(ConceptStatusColumn.COLUMN_NAME).toBe(
      ConceptModule.STATUS_COLUMN_NAME,
    );
    expect(ConceptModule.STATUS_COLUMN_NAME).toBe("status");
  });
});
