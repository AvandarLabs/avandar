import { Model } from "@avandar/models";
import { EXPLORER_SELECTED_COLUMNS } from "../Explorer.constants";
import { emptyFilter } from "./ExplorerTimeline";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
/** Construct the fixture query used by native sorting and limit controls. */
export function getExplorerQuery({
  filters,
}: Readonly<{
  filters: StructuredQuery.FilterGroup;
}>): StructuredQuery.Partial {
  return Model.make("StructuredQuery", {
    queryColumns: EXPLORER_SELECTED_COLUMNS,
    aggregations: {},
    filters,
    having: emptyFilter,
    joins: [],
    limit: undefined,
  }) as unknown as StructuredQuery.Partial;
}
