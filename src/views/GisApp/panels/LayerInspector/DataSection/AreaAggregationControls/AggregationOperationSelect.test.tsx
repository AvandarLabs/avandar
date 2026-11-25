/**
 * Choosing a number operation measures the first number field. A case type
 * field that keeps every value is a list of numbers, which SUM, AVG, MIN, and
 * MAX fail on, so it is skipped.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createConceptAttributeQueryColumn } from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { fireEvent, render, screen } from "@/test-utils";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AggregationOperationSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AggregationOperationSelect";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

vi.mock("@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates", () => {
  return {
    MapLayerUpdates: {
      getQueryColumnFromLayer: vi.fn(),
      withAreaAggregation: vi.fn(),
    },
  };
});

const CASES_LIST = createConceptAttributeQueryColumn({
  name: "Daily new cases",
  dataType: "bigint",
  isArray: true,
});
const CASES_TOTAL = createConceptAttributeQueryColumn({
  name: "Total cases",
  dataType: "bigint",
  isArray: false,
});

beforeEach(() => {
  vi.mocked(MapLayerUpdates.withAreaAggregation).mockReset();
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
