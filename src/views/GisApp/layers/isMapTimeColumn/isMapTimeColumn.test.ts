import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { Workspace } from "$/models/Workspace/Workspace";

import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";

import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { isMapTimeColumn } from "@/views/GisApp/layers/isMapTimeColumn/isMapTimeColumn";

function _column(dataType: AvaDataType.T): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      createdAt: now,
      updatedAt: now,
      name: dataType,
      originalName: dataType,
      originalDataType: dataType.toUpperCase(),
      dataType,
      detectedDataType: dataType.toUpperCase() as DuckDbDataType,
      description: undefined,
      columnIdx: 0,
    }),
  );
}

describe("isMapTimeColumn", () => {
  it("accepts date, timestamp, and text columns", () => {
    expect(isMapTimeColumn(_column("date"))).toBe(true);
    expect(isMapTimeColumn(_column("timestamp"))).toBe(true);
    expect(isMapTimeColumn(_column("varchar"))).toBe(true);
  });

  it("rejects time-of-day and numeric columns", () => {
    expect(isMapTimeColumn(_column("time"))).toBe(false);
    expect(isMapTimeColumn(_column("bigint"))).toBe(false);
  });

  it("rejects double and boolean columns", () => {
    expect(isMapTimeColumn(_column("double"))).toBe(false);
    expect(isMapTimeColumn(_column("boolean"))).toBe(false);
  });
});
