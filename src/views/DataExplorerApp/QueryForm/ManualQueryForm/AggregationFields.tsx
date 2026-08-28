import { AggregationSelect } from "@/views/DataExplorerApp/AggregationSelect";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { ReactNode } from "react";

type Props = {
  queryColumns: StructuredQuery.Partial["queryColumns"];
  aggregations: StructuredQuery.Partial["aggregations"];
  onSetColumnAggregation: ManualQueryFormHandlers["onSetColumnAggregation"];
  withinPortal: boolean;
};

/** One aggregation picker per selected column. */
export function AggregationFields({
  queryColumns,
  aggregations,
  onSetColumnAggregation,
  withinPortal,
}: Props): ReactNode {
  return (
    <>
      {queryColumns.map((column) => {
        return (
          <AggregationSelect
            key={column.id}
            label={column.baseColumn.name}
            dataType={column.baseColumn.dataType}
            value={aggregations[column.id] ?? "none"}
            onChange={(newAggregation: QueryAggregationType.T) => {
              onSetColumnAggregation({
                columnId: column.id,
                aggregation: newAggregation,
              });
            }}
            comboboxProps={{ withinPortal }}
          />
        );
      })}
    </>
  );
}
