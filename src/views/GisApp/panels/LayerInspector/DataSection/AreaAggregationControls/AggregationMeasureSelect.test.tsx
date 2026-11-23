/**
 * The measure of an area aggregation is a number. A case type field that keeps
 * every value is a list of numbers, which SUM, AVG, MIN, and MAX fail on.
 */
import { describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createConceptAttributeQueryColumn } from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { render } from "@/test-utils";
import { AggregationMeasureSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AggregationMeasureSelect";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

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
