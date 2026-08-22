import { Model } from "@avandar/models";
import { beforeEach, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { render, waitFor } from "@/test-utils";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const clientState = vi.hoisted(() => {
  return { datasetColumns: [] as unknown[] };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [[...clientState.datasetColumns], false];
      },
    },
  };
});

vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        return [[], false];
      },
    },
  };
});

function _createDatasetColumn(): DatasetColumn.T {
  const timestamp = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: timestamp,
    updatedAt: timestamp,
    name: "boundary_key",
    originalName: "boundary_key",
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  });
}

beforeEach(() => {
  clientState.datasetColumns = [];
});

it("preserves a controlled selection while its base column remains available", async () => {
  const datasetColumn = _createDatasetColumn();
  const selectedColumn = QueryColumn.makeFromDatasetColumn(datasetColumn);
  const onChange = vi.fn();
  clientState.datasetColumns = [{ ...datasetColumn }];

  render(
    <QueryColumnSingleSelect
      label="Column"
      placeholder="Select a column"
      dataSourceId={{ __type: "Dataset", id: datasetColumn.datasetId }}
      value={selectedColumn}
      onChange={onChange}
    />,
  );

  await waitFor(() => {
    expect(onChange).not.toHaveBeenCalled();
  });
});

it("clears a controlled selection when its base column is unavailable", async () => {
  const datasetColumn = _createDatasetColumn();
  const selectedColumn = QueryColumn.makeFromDatasetColumn(datasetColumn);
  const onChange = vi.fn();

  render(
    <QueryColumnSingleSelect
      label="Column"
      placeholder="Select a column"
      dataSourceId={{ __type: "Dataset", id: datasetColumn.datasetId }}
      value={selectedColumn}
      onChange={onChange}
    />,
  );

  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
