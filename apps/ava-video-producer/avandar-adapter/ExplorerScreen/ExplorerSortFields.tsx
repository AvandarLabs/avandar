import { LimitFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/LimitFields/LimitFields";
import { SortFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/SortFields";
import { EXPLORER_SELECTED_COLUMNS } from "../Explorer.constants";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

type Props = { query: StructuredQuery.Partial };
const _noop = () => {};
/** Render the native sort and row-limit fields over the fixture query. */
export function ExplorerSortFields({ query }: Readonly<Props>): ReactNode {
  return (
    <>
      <SortFields
        queryColumns={EXPLORER_SELECTED_COLUMNS}
        orderByColumn={undefined}
        orderByDirection={undefined}
        onSetOrderByColumn={_noop}
        onSetOrderByDirection={_noop}
        withinPortal={false}
      />
      <LimitFields
        query={query}
        onSetLimit={_noop}
        isLargeDatasetLimitHintVisible={false}
        dismissLargeDatasetLimitHint={_noop}
      />
    </>
  );
}
