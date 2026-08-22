import { matchLiteral } from "@avandar/utils";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import { SqlQueryView } from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView";
import type { ReactNode } from "react";

/**
 * The editors the Query tab can show, in rail order. Exported so the rail's
 * control options and its narrowing of Mantine's bare string come from one
 * list.
 */
export const QUERY_EDITOR_MODES = ["manual", "sql"] as const;

/** Which editor the Query tab is showing. */
export type QueryEditorMode = (typeof QUERY_EDITOR_MODES)[number];

type Props = {
  mode: QueryEditorMode;
};

/**
 * Body of the drawer's Query tab. Shows either the structured form or the raw
 * SQL for the current query. Both read and write through
 * `DataExplorerStateManager`, so they stay in sync with the canvas and with
 * whichever AI prompt produced the SQL.
 */
export function QueryTabPanel({ mode }: Props): ReactNode {
  return matchLiteral(mode, {
    sql: () => {
      return <SqlQueryView layout="columns" />;
    },
    manual: () => {
      return <ManualQueryForm withinPortal layout="columns" />;
    },
  });
}
