import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { makeProjectionDescriptorsFromStructuredQuery } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromStructuredQuery/makeProjectionDescriptorsFromStructuredQuery";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import {
  getResultColumnCodes,
  getSourceDatasetIdFromProjections,
} from "@/lib/dataDictionaries/getResultColumnCodes/getResultColumnCodes";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ProjectionDescriptor } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const CONCEPT_TABLE = "concept_bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const GENDER_CODES: ColumnCodes.T = {
  direction: "decode",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
  description: undefined,
  datasetColumnId: "gender-column",
  dictionaryId: "dictionary-1",
  dictionaryName: "NYS codes",
  entryName: "sex",
  codeListName: "Sex (1/2/9)",
  isOrdered: false,
  mode: "reference",
};
const CODES = new Map([["GENDER", GENDER_CODES]]);

function _projections(sql: string, columnNames: readonly string[]) {
  return makeProjectionDescriptorsFromSql({
    sql,
    columns: columnNames.map((name) => {
      return { name, dataType: "varchar" as const };
    }),
  });
}

function _codesOf(
  projections: readonly ProjectionDescriptor[],
  resultColumnNames: readonly string[],
): Map<string, ColumnCodes.T> {
  return getResultColumnCodes({
    projections,
    datasetId: DATASET_ID,
    codesByColumnName: CODES,
    resultColumnNames,
  });
}

function _makeDataset(): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: DATASET_ID,
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Kings line list",
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

function _makeQueryColumn(dataset: Dataset.T, name: string): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: dataset.id,
      workspaceId: dataset.workspaceId,
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: "BIGINT",
      dataType: "bigint",
      detectedDataType: "BIGINT",
      description: undefined,
      columnIdx: 0,
    }),
  );
}

describe("getResultColumnCodes", () => {
  it("gives a column selected as is its code list", () => {
    const projections = _projections(
      `SELECT "GENDER", "county" FROM "${DATASET_ID}"`,
      ["GENDER", "county"],
    );

    expect(getSourceDatasetIdFromProjections(projections)).toBe(DATASET_ID);
    expect(_codesOf(projections, ["GENDER", "county"]).get("GENDER")).toBe(
      GENDER_CODES,
    );
  });

  it("finds the codes of an unquoted lowercase column under its stored name", () => {
    const projections = _projections(`SELECT gender FROM "${DATASET_ID}"`, [
      "GENDER",
    ]);

    expect([..._codesOf(projections, ["GENDER"])]).toEqual([
      ["GENDER", GENDER_CODES],
    ]);
  });

  it("finds the codes of a quoted lowercase column under its stored name", () => {
    const projections = _projections(`SELECT "gender" FROM "${DATASET_ID}"`, [
      "GENDER",
    ]);

    expect([..._codesOf(projections, ["GENDER"])]).toEqual([
      ["GENDER", GENDER_CODES],
    ]);
  });

  it("keys an aliased column by its alias", () => {
    const projections = _projections(
      `SELECT "GENDER" AS sex FROM "${DATASET_ID}"`,
      ["sex"],
    );

    expect([..._codesOf(projections, ["sex"])]).toEqual([
      ["sex", GENDER_CODES],
    ]);
  });

  it("gives an aggregated column none", () => {
    const projections = _projections(
      `SELECT max("GENDER") AS top FROM "${DATASET_ID}"`,
      ["top"],
    );

    expect(_codesOf(projections, ["top"]).size).toBe(0);
  });

  it("tags a column the query builder groups by", () => {
    const dataset = _makeDataset();
    const gender = _makeQueryColumn(dataset, "GENDER");
    const projections = makeProjectionDescriptorsFromStructuredQuery({
      ...StructuredQuery.makeEmpty(),
      dataSource: dataset,
      queryColumns: [gender],
      aggregations: { [gender.id]: "group_by" },
    });

    expect(getSourceDatasetIdFromProjections(projections)).toBe(DATASET_ID);
    expect(_codesOf(projections, ["GENDER"]).get("GENDER")).toBe(GENDER_CODES);
  });
});

describe("getSourceDatasetIdFromProjections", () => {
  it("is undefined when no projection selects a dataset column", () => {
    expect(
      getSourceDatasetIdFromProjections(
        _projections(`SELECT count(*) AS total FROM "${DATASET_ID}"`, [
          "total",
        ]),
      ),
    ).toBeUndefined();
  });

  it("is undefined for a relation that is not a dataset", () => {
    expect(
      getSourceDatasetIdFromProjections(
        _projections(`SELECT "GENDER" FROM "${CONCEPT_TABLE}"`, ["GENDER"]),
      ),
    ).toBeUndefined();
  });
});
