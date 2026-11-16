import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { makeDataSlotSourceFromDataset } from "@/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const DATASET = Model.make("Dataset", {
  id: "dataset_line_list",
  name: "line_list.csv",
}) as Dataset.T;

function _makeColumn(
  options: Readonly<{
    id: string;
    name: string;
    columnIdx: number;
    dataType: AvaDataType.T;
  }>,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    ...options,
    datasetId: DATASET.id,
    originalName: `original ${options.name}`,
  }) as DatasetColumn.T;
}

describe("makeDataSlotSourceFromDataset", () => {
  it("lists the dataset's columns in column order, named as the relation names them", () => {
    const source = makeDataSlotSourceFromDataset({
      dataset: DATASET,
      columns: [
        _makeColumn({
          id: "col_district",
          name: "district",
          columnIdx: 1,
          dataType: "varchar",
        }),
        _makeColumn({
          id: "col_onset",
          name: "onset",
          columnIdx: 0,
          dataType: "date",
        }),
      ],
    });

    expect(source).toEqual({
      kind: "dataset",
      datasetId: "dataset_line_list",
      name: "line_list.csv",
      fields: [
        {
          id: "col_onset",
          columnName: "onset",
          label: "onset",
          dataType: "date",
        },
        {
          id: "col_district",
          columnName: "district",
          label: "district",
          dataType: "varchar",
        },
      ],
    });
  });
});
