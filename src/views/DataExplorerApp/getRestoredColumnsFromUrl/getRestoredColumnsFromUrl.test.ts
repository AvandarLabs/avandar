/**
 * A shared Data Explorer URL can outlive the schema it names. These pin that a
 * stale column name degrades to a partial restore rather than failing the whole
 * hydration.
 */
import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { describe, expect, it } from "vitest";
import { getRestoredColumnsFromUrl } from "@/views/DataExplorerApp/getRestoredColumnsFromUrl/getRestoredColumnsFromUrl";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

function _makeDatasetColumn(name: string): DatasetColumn.T {
  const now = "2026-01-01T00:00:00.000Z";
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "DOUBLE",
    dataType: "double",
    detectedDataType: "DOUBLE",
    isDataTypeUserSet: false,
    description: undefined,
    columnIdx: 0,
  });
}

function _makeConceptAttribute(name: string): ConceptAttribute.T {
  const now = "2026-01-01T00:00:00.000Z";
  return Model.make("ConceptAttribute", {
    id: uuid<ConceptAttribute.Id>(),
    conceptId: uuid<Concept.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    name,
    description: undefined,
    createdAt: now,
    updatedAt: now,
    dataType: "varchar",
    mappingType: "manual_entry",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: true,
    isArray: false,
  });
}

describe("getRestoredColumnsFromUrl", () => {
  it("resolves concept attribute names, which use a different source model", () => {
    // A concept source supplies its columns through ConceptAttribute rather
    // than DatasetColumn. Without this, deleting that whole conversion from
    // the source leaves every other test in this file green.
    const restored = getRestoredColumnsFromUrl({
      colNames: ["status"],
      datasetColumns: undefined,
      conceptAttributes: [_makeConceptAttribute("status")],
    });

    expect(restored.map(prop("baseColumn.name"))).toEqual(["status"]);
  });

  it("resolves dataset column names to query columns", () => {
    const restored = getRestoredColumnsFromUrl({
      colNames: ["region", "total"],
      datasetColumns: [
        _makeDatasetColumn("region"),
        _makeDatasetColumn("total"),
      ],
      conceptAttributes: undefined,
    });

    expect(restored.map(prop("baseColumn.name"))).toEqual(["region", "total"]);
  });

  it("follows the URL's ordering, not the source schema's", () => {
    // The restored selection has to read the way the URL that produced it did,
    // so this fixture deliberately lists the columns in the opposite order.
    const restored = getRestoredColumnsFromUrl({
      colNames: ["total", "region"],
      datasetColumns: [
        _makeDatasetColumn("region"),
        _makeDatasetColumn("total"),
      ],
      conceptAttributes: undefined,
    });

    expect(restored.map(prop("baseColumn.name"))).toEqual(["total", "region"]);
  });

  it("drops a name that no longer matches a column and keeps the rest", () => {
    const restored = getRestoredColumnsFromUrl({
      colNames: ["region", "deleted_column", "total"],
      datasetColumns: [
        _makeDatasetColumn("region"),
        _makeDatasetColumn("total"),
      ],
      conceptAttributes: undefined,
    });

    expect(restored.map(prop("baseColumn.name"))).toEqual(["region", "total"]);
  });

  it("returns nothing when the URL named no columns", () => {
    expect(
      getRestoredColumnsFromUrl({
        colNames: undefined,
        datasetColumns: [_makeDatasetColumn("region")],
        conceptAttributes: undefined,
      }),
    ).toEqual([]);
  });

  it("returns nothing when the columns have not loaded yet", () => {
    expect(
      getRestoredColumnsFromUrl({
        colNames: ["region"],
        datasetColumns: undefined,
        conceptAttributes: undefined,
      }),
    ).toEqual([]);
  });
});
