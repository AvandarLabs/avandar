import { createWebLogger } from "@avandar/logger";
import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { describe, expect, it, vi } from "vitest";
import { createConceptWrapper } from "@/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptRelationRef } from "$/models/relations/RelationRef/RelationRef.types";
import type { WrapperContext } from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = uuid<Workspace.Id>();
const CONCEPT_ID = uuid<Concept.Id>();
const CONCEPT_REF: ConceptRelationRef = { kind: "concept", id: CONCEPT_ID };

const CONTEXT: WrapperContext = {
  workspaceId: WORKSPACE_ID,
  logger: createWebLogger({ loggerName: "ConceptWrapper", enabled: false }),
};

/** An honest `ConceptAttribute.T`, built through `Model.make` with no cast. */
function _createConceptAttribute(params: {
  name: string;
  dataType: AvaDataType.T;
  isArray?: boolean;
}): ConceptAttribute.T {
  const now = new Date().toISOString();
  return Model.make("ConceptAttribute", {
    id: uuid<ConceptAttribute.Id>(),
    conceptId: CONCEPT_ID,
    workspaceId: WORKSPACE_ID,
    name: params.name,
    description: undefined,
    createdAt: now,
    updatedAt: now,
    dataType: params.dataType,
    mappingType: "manual_entry",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: true,
    isArray: params.isArray ?? false,
  });
}

describe("ConceptWrapper", () => {
  it("claims concept refs and leaves dataset refs to another wrapper", () => {
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn(),
      getConceptExtension: vi.fn(),
    });

    expect(wrapper.handles(CONCEPT_REF)).toBe(true);
    expect(wrapper.handles({ kind: "dataset", id: uuid<Dataset.Id>() })).toBe(
      false,
    );
  });

  it("declares pushdown and provides a pushdown implementation to match", () => {
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn(),
      getConceptExtension: vi.fn(),
    });

    // A declared capability the mediator can dispatch on has to be backed by a
    // method, or the mediator's pushdown branch calls `undefined`.
    expect(wrapper.capabilities.predicatePushdown).not.toBe("none");
    expect(typeof wrapper.pushDown).toBe("function");
  });

  it("describes a concept as its attributes, mapped to DuckDB types", async () => {
    const getConceptExtension = vi.fn();
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn().mockResolvedValue([
        _createConceptAttribute({ name: "district", dataType: "varchar" }),
        _createConceptAttribute({ name: "cases", dataType: "bigint" }),
        _createConceptAttribute({
          name: "aliases",
          dataType: "varchar",
          isArray: true,
        }),
      ]),
      getConceptExtension,
    });

    await expect(wrapper.describe(CONCEPT_REF, CONTEXT)).resolves.toEqual({
      columns: [
        { name: "district", dataType: "VARCHAR", isArray: false },
        { name: "cases", dataType: "BIGINT", isArray: false },
        // An array attribute keeps its ELEMENT type and reports multiplicity
        // separately. Collapsing it to a bare `LIST` would discard the element
        // type, which is the one thing a caller building the column needs.
        { name: "aliases", dataType: "VARCHAR", isArray: true },
      ],
    });
    // Describing must not pull rows: it is the cheap half of the interface.
    expect(getConceptExtension).not.toHaveBeenCalled();
  });

  it("pushes down by returning the extension keyed by attribute name", async () => {
    const district = _createConceptAttribute({
      name: "district",
      dataType: "varchar",
    });
    const cases = _createConceptAttribute({
      name: "cases",
      dataType: "bigint",
    });
    const getConceptExtension = vi.fn().mockResolvedValue([
      { [district.id]: "Gulu", [cases.id]: 12 },
      { [district.id]: "Lira", [cases.id]: 4 },
    ]);
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn().mockResolvedValue([district, cases]),
      getConceptExtension,
    });

    const result = await wrapper.pushDown?.(
      { ref: CONCEPT_REF, sql: "select * from concept_x" },
      CONTEXT,
    );

    expect(getConceptExtension).toHaveBeenCalledWith({
      conceptId: CONCEPT_ID,
      conceptAttributes: [district, cases],
      workspaceId: WORKSPACE_ID,
    });
    expect(result?.data).toEqual([
      { district: "Gulu", cases: 12 },
      { district: "Lira", cases: 4 },
    ]);
    expect(result?.columns).toEqual([
      { name: "district", dataType: "varchar" },
      { name: "cases", dataType: "bigint" },
    ]);
    expect(result?.numRows).toBe(2);
  });

  it("pushes down an empty result when the concept has no individuals", async () => {
    const district = _createConceptAttribute({
      name: "district",
      dataType: "varchar",
    });
    const wrapper = createConceptWrapper({
      getConceptAttributes: vi.fn().mockResolvedValue([district]),
      getConceptExtension: vi.fn().mockResolvedValue([]),
    });

    const result = await wrapper.pushDown?.(
      { ref: CONCEPT_REF, sql: "select * from concept_x" },
      CONTEXT,
    );

    expect(result?.data).toEqual([]);
    expect(result?.numRows).toBe(0);
    // The columns still describe the relation, so a caller can render a header
    // for a concept with no rows.
    expect(result?.columns).toEqual([
      { name: "district", dataType: "varchar" },
    ]);
  });
});
