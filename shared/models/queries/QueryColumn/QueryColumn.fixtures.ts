/**
 * Typed `QueryColumn` factories for tests, built through `Model.make` with no
 * cast.
 */
import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const FIXTURE_TIMESTAMP = "2026-11-06T00:00:00Z";

/**
 * A query column over a case type field. With `isArray`, the field keeps
 * every value, so the column is a list.
 */
export function createConceptAttributeQueryColumn(
  options: Readonly<{
    name: string;
    dataType?: AvaDataType.T;
    isArray: boolean;
  }>,
): QueryColumn.T {
  const attribute: ConceptAttribute.T = Model.make("ConceptAttribute", {
    id: uuid<ConceptAttribute.Id>(),
    conceptId: uuid<Concept.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    name: options.name,
    description: undefined,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    dataType: options.dataType ?? "varchar",
    mappingType: "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: options.isArray,
  });
  return QueryColumn.makeFromConceptAttributes([attribute])[0]!;
}

/** A query column over a dataset column of the given type. */
export function createDatasetQueryColumn(
  options: Readonly<{ name: string; dataType: AvaDataType.T }>,
): QueryColumn.T {
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
      name: options.name,
      originalName: options.name,
      originalDataType: options.dataType.toUpperCase(),
      dataType: options.dataType,
      detectedDataType: options.dataType.toUpperCase() as DuckDbDataType,
      description: undefined,
      columnIdx: 0,
    }),
  );
}
