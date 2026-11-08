import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeCaseDetailsRowsFromAttributes } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ManualEntryMapping } from "$/models/ontology/AttributeMapping/ManualEntryMapping/ManualEntryMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const CONCEPT_ID = uuid<Concept.Id>();
const WORKSPACE_ID = uuid<Workspace.Id>();
const NOW = "2026-11-06T00:00:00.000Z";

function _makeAttribute(
  options: Readonly<{
    name: string;
    mappingType?: ConceptAttribute.T["mappingType"];
  }>,
): ConceptAttribute.T {
  return Model.make("ConceptAttribute", {
    id: uuid<ConceptAttribute.Id>(),
    conceptId: CONCEPT_ID,
    workspaceId: WORKSPACE_ID,
    name: options.name,
    description: undefined,
    createdAt: NOW,
    updatedAt: NOW,
    dataType: "varchar",
    mappingType: options.mappingType ?? "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: false,
  });
}

function _makeDataset(name: string): Dataset.T {
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: NOW,
    updatedAt: NOW,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name,
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: WORKSPACE_ID,
  });
}

function _makeMapping(
  options: Readonly<{ attribute: ConceptAttribute.T; dataset: Dataset.T }>,
): AttributeMapping {
  return {
    id: uuid<DatasetColumnMapping["id"]>(),
    workspaceId: WORKSPACE_ID,
    type: "dataset_column",
    conceptAttributeId: options.attribute.id,
    valuePickerRuleType: "first",
    datasetId: options.dataset.id,
    datasetColumnId: uuid<DatasetColumn.Id>(),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("makeCaseDetailsRowsFromAttributes", () => {
  it("orders fields by name whatever order they arrive in", () => {
    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [
        _makeAttribute({ name: "zone" }),
        _makeAttribute({ name: "age" }),
        _makeAttribute({ name: "measles" }),
      ],
      valuesByAttributeId: {},
      mappings: [],
      datasets: [],
    });

    expect(
      rows.map((row) => {
        return row.name;
      }),
    ).toEqual(["age", "measles", "zone"]);
  });

  // Provenance belongs to the field's mappings, not to a value: a field may
  // read several datasets.
  it("names the dataset each of a field's mappings reads, and none for a manual-entry field", () => {
    const region = _makeAttribute({ name: "region" });
    const note = _makeAttribute({ name: "note", mappingType: "manual_entry" });
    const lineList = _makeDataset("Line list");

    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [region, note],
      valuesByAttributeId: {},
      mappings: [_makeMapping({ attribute: region, dataset: lineList })],
      datasets: [lineList],
    });

    expect(
      rows.map((row) => {
        return [row.name, row.sourceNames];
      }),
    ).toEqual([
      ["note", []],
      ["region", ["Line list"]],
    ]);
  });

  it("takes each field's value by the field's id", () => {
    const age = _makeAttribute({ name: "age" });
    const note = _makeAttribute({ name: "note", mappingType: "manual_entry" });
    const region = _makeAttribute({ name: "region" });

    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [age, note, region],
      valuesByAttributeId: { [age.id]: 41, [note.id]: null },
      mappings: [],
      datasets: [],
    });

    expect(
      rows.map((row) => {
        return row.value;
      }),
    ).toEqual([41, null, undefined]);
  });

  it("lists two datasets that share a name once each, and a dataset once per field", () => {
    const region = _makeAttribute({ name: "region" });
    const firstLineList = _makeDataset("Line list");
    const secondLineList = _makeDataset("Line list");

    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [region],
      valuesByAttributeId: {},
      mappings: [
        _makeMapping({ attribute: region, dataset: firstLineList }),
        _makeMapping({ attribute: region, dataset: firstLineList }),
        _makeMapping({ attribute: region, dataset: secondLineList }),
      ],
      datasets: [firstLineList, secondLineList],
    });

    expect(rows[0]?.sourceNames).toEqual(["Line list", "Line list"]);
  });

  it("lists a field's datasets in name order, not mapping order", () => {
    const region = _makeAttribute({ name: "region" });
    const zeta = _makeDataset("Zeta");
    const alpha = _makeDataset("Alpha");

    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [region],
      valuesByAttributeId: {},
      mappings: [
        _makeMapping({ attribute: region, dataset: zeta }),
        _makeMapping({ attribute: region, dataset: alpha }),
      ],
      datasets: [zeta, alpha],
    });

    expect(rows[0]?.sourceNames).toEqual(["Alpha", "Zeta"]);
  });

  it("names no source for a mapping whose dataset is not in the list", () => {
    const region = _makeAttribute({ name: "region" });
    const missingDataset = _makeDataset("Missing");

    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [region],
      valuesByAttributeId: {},
      mappings: [_makeMapping({ attribute: region, dataset: missingDataset })],
      datasets: [],
    });

    expect(rows[0]?.sourceNames).toEqual([]);
  });

  it("names no source for a manual-entry mapping", () => {
    const note = _makeAttribute({ name: "note", mappingType: "manual_entry" });
    const lineList = _makeDataset("Line list");

    const rows = makeCaseDetailsRowsFromAttributes({
      attributes: [note],
      valuesByAttributeId: {},
      mappings: [
        {
          id: uuid<ManualEntryMapping["id"]>(),
          workspaceId: WORKSPACE_ID,
          type: "manual_entry",
          conceptAttributeId: note.id,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      datasets: [lineList],
    });

    expect(rows[0]?.sourceNames).toEqual([]);
  });
});
