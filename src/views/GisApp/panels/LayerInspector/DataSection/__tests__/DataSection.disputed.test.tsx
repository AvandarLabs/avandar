import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen } from "@/test-utils";
import {
  createBoundLayer,
  createGeometryLayer,
  fixtures,
  resetDataSectionFixtures,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { DisputedStatusControls } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedStatusControls";

/** The DuckDB spelling of each `AvaDataType` used by this test file. */
const DUCK_DB_DATA_TYPES = {
  varchar: "VARCHAR",
  bigint: "BIGINT",
} as const;

/** An honest text or numeric `QueryColumn`, used only by this test file. */
function _column(
  name: string,
  dataType: keyof typeof DUCK_DB_DATA_TYPES,
): QueryColumn.T {
  const now = new Date().toISOString();
  const duckDbDataType = DUCK_DB_DATA_TYPES[dataType];
  return QueryColumnModel.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid(),
      workspaceId: uuid(),
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: duckDbDataType,
      dataType,
      detectedDataType: duckDbDataType,
      description: undefined,
      columnIdx: 0,
    }),
  );
}

function _statusColumn(): QueryColumn.T {
  return _column("status", "varchar");
}

/**
 * A copy of `column` with a freshly minted id, same `baseColumn`.
 *
 * `useLayerSourceColumns` mints a new `QueryColumn.id` on every call, so this
 * simulates the option the mocked hook hands back for a column that is
 * already selected elsewhere on the layer under a different `QueryColumn.id`.
 */
function _remint(column: QueryColumn.T): QueryColumn.T {
  return { ...column, id: uuid<QueryColumn.Id>() };
}

function _circleLayer(): MapLayer.T {
  return createBoundLayer();
}

function _polygonFillLayer(): MapLayer.T {
  return createGeometryLayer();
}

function _boundPolygonFillLayer(): MapLayer.T {
  const column = _statusColumn();
  fixtures.sourceColumns = [column];
  return {
    ..._polygonFillLayer(),
    disputedStatusColumn: { type: "queryColumn", column: column.id },
  };
}

function _boundPolygonFillLayerWithDisputed(
  disputed: readonly string[],
): MapLayer.T {
  return {
    ..._boundPolygonFillLayer(),
    disputedStatusValues: { disputed, undetermined: [] },
  };
}

function _render(options: {
  layer: MapLayer.T;
  onLayerChange?: LayerChangeHandler;
}) {
  return render(
    <DisputedStatusControls
      layer={options.layer}
      onLayerChange={options.onLayerChange ?? vi.fn()}
    />,
  );
}

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("DisputedStatusControls", () => {
  it("is not offered on a circle layer", () => {
    _render({ layer: _circleLayer() });

    expect(
      screen.queryByRole("combobox", { name: "Disputed status column" }),
    ).toBeNull();
  });

  it("is offered on a polygon fill layer", () => {
    _render({ layer: _polygonFillLayer() });

    expect(
      screen.getByRole("combobox", { name: "Disputed status column" }),
    ).toBeInTheDocument();
  });

  it("states that outlines are settled when nothing is bound", () => {
    _render({ layer: _polygonFillLayer() });

    expect(
      screen.getByText(
        "No disputed-status column. Outlines render as settled.",
      ),
    ).toBeInTheDocument();
  });

  it("states that outlines are settled when no value is assigned", () => {
    _render({ layer: _boundPolygonFillLayer() });

    expect(
      screen.getByText(
        "Column bound. No values assigned; outlines render as settled.",
      ),
    ).toBeInTheDocument();
  });

  it("does not offer a numeric column", () => {
    fixtures.sourceColumns = [
      _column("status", "varchar"),
      _column("population", "bigint"),
    ];
    _render({ layer: _polygonFillLayer() });
    fireEvent.click(
      screen.getByRole("combobox", { name: "Disputed status column" }),
    );

    expect(
      screen.getByRole("option", { name: "status", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "population", hidden: true }),
    ).toBeNull();
  });

  it("does not append a query column that is already on the layer", () => {
    const statusColumn = _statusColumn();
    fixtures.sourceColumns = [_remint(statusColumn)];
    const layer: MapLayer.T = {
      ..._polygonFillLayer(),
      source: {
        ..._polygonFillLayer().source,
        queryColumns: [statusColumn],
      },
      timeColumn: statusColumn.id,
    };
    const onLayerChange = vi.fn<LayerChangeHandler>();
    _render({ layer, onLayerChange });

    fireEvent.click(
      screen.getByRole("combobox", { name: "Disputed status column" }),
    );
    fireEvent.click(
      screen.getByRole("option", { name: "status", hidden: true }),
    );

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.source.queryColumns).toHaveLength(
      layer.source.queryColumns.length,
    );
    expect(updated.disputedStatusColumn).toEqual({
      type: "queryColumn",
      column: statusColumn.id,
    });
  });

  it("rejects assigning one value to both lists", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = _boundPolygonFillLayerWithDisputed(["Disputed"]);
    _render({ layer, onLayerChange });

    fireEvent.click(
      screen.getByRole("textbox", { name: "Undetermined values" }),
    );
    fireEvent.click(
      screen.getByRole("option", { name: "Disputed", hidden: true }),
    );

    expect(onLayerChange.mock.calls[0]![0](layer)).toBe(layer);
  });

  it("clears the values when the column is unbound", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = _boundPolygonFillLayerWithDisputed(["Disputed"]);
    _render({ layer, onLayerChange });

    fireEvent.click(
      screen.getByRole("button", { name: "Clear Disputed status column" }),
    );

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.disputedStatusColumn).toBeUndefined();
    expect(updated.disputedStatusValues).toEqual({
      disputed: [],
      undetermined: [],
    });
  });
});
