import { MappingPane } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/MappingPane";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type {
  CrosswalkAction,
  CrosswalkContext,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { LayoutValues } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useLayoutValues/useLayoutValues";
import type { Dispatch, ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  context: CrosswalkContext;
  layout: CrosswalkDraft.Layout;
  values: LayoutValues;
  selectedColumnId: CrosswalkColumn.Id | undefined;
  dispatch: Dispatch<CrosswalkAction>;
};

/** The layout's first dataset's columns, the sources a fill can read. */
function _getSourceColumns(
  layout: CrosswalkDraft.Layout,
  context: CrosswalkContext,
): CrosswalkLayout.Dataset["columns"] {
  const firstDatasetId = layout.datasetIds[0];
  const columns = firstDatasetId
    ? context.datasetsById.get(firstDatasetId)?.columns
    : undefined;
  return (
    columns ??
    layout.columnNames.map((name) => {
      return { name, dataType: "varchar" as const };
    })
  );
}

/**
 * The side pane for the selected column, or nothing when there is none.
 * The pane is keyed by layout and column, so choosing another column starts
 * it over: its own-format and own-factor choices, its typed text, and its
 * example never carry from one column to the next.
 */
export function LayoutPane(props: Readonly<Props>): ReactNode {
  const { draft, context, layout, values } = props;
  const column = draft.columns.find((candidate) => {
    return candidate.id === props.selectedColumnId;
  });
  if (!column) {
    return null;
  }
  return (
    <MappingPane
      key={`${layout.id}:${column.id}`}
      draft={draft}
      layout={layout}
      column={column}
      sourceColumns={_getSourceColumns(layout, context)}
      profilesBySourceColumn={values.profilesBySourceColumn}
      dateFormatsBySourceColumn={values.dateFormatsBySourceColumn}
      context={context}
      dispatch={props.dispatch}
    />
  );
}
