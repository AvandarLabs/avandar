/**
 * A saved aggregation a column cannot take, such as a sum on a list, is shown
 * as "None" instead of a blank select.
 */
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";
import { AggregationFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

function _listFieldColumn(): QueryColumn.T {
  return QueryColumn.makeFromConceptAttributes([
    Model.make("ConceptAttribute", {
      id: "attr_cases",
      conceptId: "concept_1",
      workspaceId: "workspace_1",
      name: "Daily new cases",
      description: undefined,
      createdAt: "2026-11-06T00:00:00Z",
      updatedAt: "2026-11-06T00:00:00Z",
      dataType: "bigint",
      mappingType: "dataset_column",
      isLabel: false,
      isIdentifier: false,
      allowManualEdit: false,
      isArray: true,
    }) as ConceptAttribute.T,
  ])[0]!;
}

describe("AggregationFields", () => {
  it("shows a saved sum on a list field as None", () => {
    const column = _listFieldColumn();
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
