import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { TimeColumnSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/TimeColumnSelect/TimeColumnSelect";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { QueryColumn as QueryColumnT } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const sourceColumnsState = vi.hoisted(() => {
  return { columns: [] as QueryColumnT.T[] };
});

vi.mock("@/views/GisApp/panels/LayerInspector/useLayerSourceColumns", () => {
  return {
    useLayerSourceColumns: () => {
      return sourceColumnsState.columns;
    },
  };
});

function _column(name: string, dataType: AvaDataType.T): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: dataType.toUpperCase(),
      dataType,
      detectedDataType: dataType.toUpperCase() as DuckDbDataType,
      description: undefined,
      columnIdx: 0,
    }),
  );
}

function _layer(): MapLayer.Standard {
  return MapLayer.makeEmpty("Cases");
}

function _remint(column: QueryColumn.T): QueryColumn.T {
  return { ...column, id: uuid<QueryColumn.Id>() };
}

function _layerWithTimeColumn(column: QueryColumn.T): MapLayer.T {
  const layer = _layer();
  return {
    ...layer,
    source: { ...layer.source, queryColumns: [column] },
    timeColumn: column.id,
  };
}

describe("TimeColumnSelect", () => {
  beforeEach(() => {
    sourceColumnsState.columns = [];
  });

  it("does not bind a numeric column from the inspector", () => {
    sourceColumnsState.columns = [
      _column("occurred_on", "date"),
      _column("count", "bigint"),
    ];
    render(<TimeColumnSelect layer={_layer()} onLayerChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Time column" }));

    expect(
      screen.getByRole("option", { name: "occurred_on", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "count", hidden: true }),
    ).toBeNull();
  });

  it("hides the select on a buffer layer", () => {
    const sourceId = uuid<MapLayer.Id>();
    const layer: MapLayer.T = {
      ..._layer(),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: sourceId,
        distanceMeters: MapLayer.defaultBufferDistanceMeters,
        dissolve: false,
      },
      symbology: MapLayer.createDefaultFillSymbology(),
    };

    render(
      <TimeColumnSelect
        layer={layer}
        onLayerChange={vi.fn<LayerChangeHandler>()}
      />,
    );

    expect(
      screen.queryByRole("combobox", { name: "Time column" }),
    ).not.toBeInTheDocument();
  });

  it("shows the bound column after source columns remint ids", () => {
    const occurredOn = _column("occurred_on", "date");
    sourceColumnsState.columns = [_remint(occurredOn)];

    render(
      <TimeColumnSelect
        layer={_layerWithTimeColumn(occurredOn)}
        onLayerChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Time column" })).toHaveValue(
      "occurred_on",
    );
  });

  it("does not append a query column that is already on the layer", () => {
    const occurredOn = _column("occurred_on", "date");
    sourceColumnsState.columns = [_remint(occurredOn)];
    const layer = {
      ..._layer(),
      source: { ..._layer().source, queryColumns: [occurredOn] },
    };
    const onLayerChange = vi.fn<LayerChangeHandler>();

    render(<TimeColumnSelect layer={layer} onLayerChange={onLayerChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Time column" }));
    fireEvent.click(
      screen.getByRole("option", { name: "occurred_on", hidden: true }),
    );

    const updatedLayer = onLayerChange.mock.calls[0]![0](layer);
    expect(updatedLayer.source.queryColumns).toHaveLength(
      layer.source.queryColumns.length,
    );
  });
});
