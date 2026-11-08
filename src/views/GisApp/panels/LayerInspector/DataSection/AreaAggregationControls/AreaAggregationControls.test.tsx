/**
 * The measure of an area aggregation is a number. A case type field that keeps
 * every value is a list of numbers, which SUM, AVG, MIN, and MAX fail on.
 */
import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen } from "@/test-utils";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AggregationMeasureSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AggregationMeasureSelect";
import { AggregationOperationSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AggregationOperationSelect";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

const selectProps = vi.hoisted(() => {
  return {
    isColumnSelectable: undefined as
      | ((column: QueryColumn.T) => boolean)
      | undefined,
  };
});

vi.mock(
  "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect",
  () => {
    return {
      QueryColumnSingleSelect: (props: {
        isColumnSelectable?: (column: QueryColumn.T) => boolean;
      }) => {
        selectProps.isColumnSelectable = props.isColumnSelectable;
        return null;
      },
    };
  },
);

vi.mock("@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates", () => {
  return {
    MapLayerUpdates: {
      getQueryColumnFromLayer: vi.fn(),
      withAreaAggregation: vi.fn(),
    },
  };
});

function _field(
  options: Readonly<{ name: string; isArray: boolean }>,
): QueryColumn.T {
  return QueryColumn.makeFromConceptAttributes([
    Model.make("ConceptAttribute", {
      id: `attr_${options.name}`,
      conceptId: "concept_1",
      workspaceId: "workspace_1",
      name: options.name,
      description: undefined,
      createdAt: "2026-11-06T00:00:00Z",
      updatedAt: "2026-11-06T00:00:00Z",
      dataType: "bigint",
      mappingType: "dataset_column",
      isLabel: false,
      isIdentifier: false,
      allowManualEdit: false,
      isArray: options.isArray,
    }) as ConceptAttribute.T,
  ])[0]!;
}

const CASES_LIST = _field({ name: "Daily new cases", isArray: true });
const CASES_TOTAL = _field({ name: "Total cases", isArray: false });

beforeEach(() => {
  selectProps.isColumnSelectable = undefined;
  vi.mocked(MapLayerUpdates.withAreaAggregation).mockReset();
});

describe("AggregationMeasureSelect", () => {
  it("offers a number field but not a list of numbers", () => {
    render(
      <AggregationMeasureSelect
        layer={MapLayer.createArea("Cases")}
        dataSourceId={undefined}
        measureColumnId={CASES_TOTAL.id}
        operation="sum"
        onLayerChange={vi.fn()}
      />,
    );

    expect(selectProps.isColumnSelectable?.(CASES_TOTAL)).toBe(true);
    expect(selectProps.isColumnSelectable?.(CASES_LIST)).toBe(false);
  });
});

describe("AggregationOperationSelect", () => {
  it("measures the first number field, skipping a list of numbers", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(
      <AggregationOperationSelect
        operation="count"
        sourceColumns={[CASES_LIST, CASES_TOTAL]}
        onLayerChange={onLayerChange}
      />,
    );
    fireEvent.click(
      screen.getByLabelText("Aggregation", { selector: "input" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Sum", hidden: true }));
    onLayerChange.mock.lastCall![0](MapLayer.createArea("Cases"));

    expect(MapLayerUpdates.withAreaAggregation).toHaveBeenCalledWith(
      expect.objectContaining({ measureColumn: CASES_TOTAL }),
    );
  });
});
