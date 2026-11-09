/**
 * A saved aggregation a list cannot take, such as a sum, is shown as "None"
 * instead of a blank select. Any other column's saved aggregation is left as
 * it is.
 */
import { describe, expect, it, vi } from "vitest";
import {
  createConceptAttributeQueryColumn,
  createDatasetQueryColumn,
} from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";
import { AggregationFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields";

describe("AggregationFields", () => {
  it("does not relabel a saved max on a date column as None", () => {
    const column = createDatasetQueryColumn({
      name: "report_date",
      dataType: "date",
    });
    render(
      <AvandarAppProvider>
        <AggregationFields
          queryColumns={[column]}
          aggregations={{ [column.id]: "max" }}
          onSetColumnAggregation={vi.fn()}
          withinPortal={false}
        />
      </AvandarAppProvider>,
    );

    expect(
      screen.getByLabelText("report_date", { selector: "input" }),
    ).not.toHaveValue("None");
  });

  it("shows a saved sum on a list field as None", () => {
    const column = createConceptAttributeQueryColumn({
      name: "Daily new cases",
      dataType: "bigint",
      isArray: true,
    });
    render(
      <AvandarAppProvider>
        <AggregationFields
          queryColumns={[column]}
          aggregations={{ [column.id]: "sum" }}
          onSetColumnAggregation={vi.fn()}
          withinPortal={false}
        />
      </AvandarAppProvider>,
    );

    expect(
      screen.getByLabelText("Daily new cases", { selector: "input" }),
    ).toHaveValue("None");
  });
});
