import { Model } from "@avandar/models";
import { assertIsDefined } from "@avandar/utils";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen } from "@/test-utils";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { FilterSection } from "@/views/GisApp/panels/LayerInspector/FilterSection/FilterSection";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

const queryColumn = QueryColumn.makeFromDatasetColumn(
  Model.make("DatasetColumn", {
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    name: "Name",
    originalName: "Name",
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  }),
);

vi.mock(
  "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection",
  () => {
    return {
      InspectorSection: ({
        children,
        note,
        title,
      }: {
        children: ReactNode;
        note?: string;
        title: string;
      }) => {
        return (
          <section aria-label={title}>
            <h2>{title}</h2>
            {note ? <span data-testid="section-note">{note}</span> : null}
            {children}
          </section>
        );
      },
    };
  },
);

vi.mock("@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates", () => {
  return {
    MapLayerUpdates: {
      withApplyAoiFilter: vi.fn(({ layer, applyAoiFilter }) => {
        return { ...layer, applyAoiFilter };
      }),
      withFilters: vi.fn(({ layer, filters }) => {
        return { ...layer, source: { ...layer.source, filters } };
      }),
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField",
  () => {
    return {
      QueryFiltersField: ({
        onChange,
        value,
      }: {
        onChange: (filters: StructuredQuery.FilterGroup) => void;
        value: StructuredQuery.FilterGroup;
      }) => {
        const nextFilters: StructuredQuery.FilterGroup = {
          ...value,
          rules: [
            {
              type: "rule",
              columnName: "Name",
              operator: "=",
              value: "Ada",
            },
          ],
        };
        return (
          <button
            type="button"
            onClick={() => {
              onChange(nextFilters);
            }}
          >
            Change filter
          </button>
        );
      },
    };
  },
);

function _applyLatestUpdate(
  options: Readonly<{
    onLayerChange: ReturnType<typeof vi.fn<LayerChangeHandler>>;
    layer: MapLayer.T;
  }>,
): MapLayer.T {
  const { onLayerChange, layer } = options;
  const latestCall = onLayerChange.mock.lastCall;
  assertIsDefined(latestCall, "Expected a layer update");
  return latestCall[0](layer);
}

function _makeLayerWithFilters(
  rules: StructuredQuery.FilterGroup["rules"],
): MapLayer.T {
  const layer = MapLayer.makeEmpty("Cases");
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [queryColumn],
      filters: { type: "group", combinator: "AND", rules },
    },
  };
}

describe("FilterSection", () => {
  it("shows the number of top-level filters", () => {
    const layer = _makeLayerWithFilters([
      {
        type: "rule",
        columnName: "Name",
        operator: "=",
        value: "Ada",
      },
      {
        type: "group",
        combinator: "OR",
        rules: [],
      },
    ]);

    render(<FilterSection layer={layer} onLayerChange={vi.fn()} />);

    expect(screen.getByTestId("section-note")).toHaveTextContent("2 filters");
  });

  it("toggles applyAoiFilter without changing query filters", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = _makeLayerWithFilters([]);

    render(<FilterSection layer={layer} onLayerChange={onLayerChange} />);

    const applyAreaFilterSwitch = screen.getByRole("switch", {
      name: /apply area filter/i,
    });
    expect(applyAreaFilterSwitch).toBeChecked();

    fireEvent.click(applyAreaFilterSwitch);

    const updatedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    expect(updatedLayer.applyAoiFilter).toBe(false);
    expect(updatedLayer.source.filters.rules).toEqual([]);
    expect(MapLayerUpdates.withApplyAoiFilter).toHaveBeenCalledWith({
      layer,
      applyAoiFilter: false,
    });
    expect(MapLayerUpdates.withFilters).not.toHaveBeenCalled();
  });

  it("hides the apply area filter switch on the annotation row", () => {
    render(
      <FilterSection
        layer={_makeLayerWithFilters([])}
        onLayerChange={vi.fn()}
        showApplyAoiFilterSwitch={false}
      />,
    );

    expect(
      screen.queryByRole("switch", { name: /apply area filter/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the apply area filter switch on a buffer of layer", () => {
    const source = MapLayer.makeEmpty("Cases");
    const layer: MapLayer.T = {
      ..._makeLayerWithFilters([]),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        dissolve: false,
      },
    };

    render(<FilterSection layer={layer} onLayerChange={vi.fn()} />);

    expect(
      screen.queryByRole("switch", { name: /apply area filter/i }),
    ).not.toBeInTheDocument();
  });

  it("writes filter changes through the layer update handler", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = _makeLayerWithFilters([]);

    render(<FilterSection layer={layer} onLayerChange={onLayerChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Change filter" }));

    const updatedLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    expect(updatedLayer.source.filters.rules).toEqual([
      {
        type: "rule",
        columnName: "Name",
        operator: "=",
        value: "Ada",
      },
    ]);
  });
});
