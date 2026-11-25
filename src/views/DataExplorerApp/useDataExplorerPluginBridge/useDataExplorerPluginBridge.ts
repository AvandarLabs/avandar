import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { t } from "@lingui/core/macro";
import { useLayoutEffect, useMemo, useRef } from "react";
import { notifyWarning } from "@/utils/notifications/notify";
import { makeDerivedColumnsSnapshotFromState } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { notifyDerivedColumnsAdded } from "@/views/DataExplorerApp/notifyDerivedColumnsAdded/notifyDerivedColumnsAdded";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { RefObject } from "react";

type Dispatch = ReturnType<typeof DataExplorerStateManager.useDispatch>;

/**
 * The explorer as of the latest render. Commands are async and Undo fires
 * later, so the bridge reads these instead of the values it was built with.
 */
type LatestExplorer = Readonly<{
  executedSql: string | undefined;
  state: DataExplorerAppState;
}>;

function _warnNothingToUndo(): void {
  notifyWarning({
    title: t`Nothing to undo`,
    message: t`The query changed after the columns were added.`,
  });
}

function _makeBridgeFromBaseSql(
  options: Readonly<{
    baseSql: string;
    latestRef: RefObject<LatestExplorer>;
    dispatch: Dispatch;
  }>,
): DataExplorerBridge {
  const { baseSql, latestRef, dispatch } = options;
  return {
    baseSql,
    applyDerivedColumnsSql: ({ sql, columnNames }) => {
      const { executedSql, state } = latestRef.current;
      if (
        executedSql === undefined ||
        normalizeSqlForSubquery(executedSql) !==
          normalizeSqlForSubquery(baseSql)
      ) {
        return false;
      }
      const snapshot = makeDerivedColumnsSnapshotFromState(state);
      dispatch.applyDerivedColumnsSql(sql);
      notifyDerivedColumnsAdded({
        columnNames,
        onUndo: () => {
          if (latestRef.current.state.rawSql === sql) {
            dispatch.restoreDerivedColumnsSnapshot(snapshot);
          } else {
            _warnNothingToUndo();
          }
        },
      });
      return true;
    },
  };
}

/**
 * Builds what the Data Explorer lends a toolbar plugin command so
 * `avandar.dataExplorer.addColumns` can add columns to its query. The getter
 * captures the result on screen when the command is clicked. Applying
 * returns false, changing nothing, once the explorer shows another result or
 * has unmounted.
 * Undefined while there is no result to run on.
 *
 * Used by `DataExplorerApp`, which passes the getter to `PluginMenuSlot`.
 */
export function useDataExplorerPluginBridge(
  options: Readonly<{
    /**
     * `executedSql` of the result on screen, or undefined while there is
     * none or a run is in flight.
     */
    executedSql: string | undefined;
  }>,
): (() => DataExplorerBridge) | undefined {
  const { executedSql } = options;
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const latestRef = useRef<LatestExplorer>({ executedSql, state });
  useLayoutEffect(() => {
    latestRef.current = { executedSql, state };
    return () => {
      // Plugin modals live at the app root and can outlast the explorer. With
      // no executed SQL, an apply after unmount returns false.
      latestRef.current = { executedSql: undefined, state };
    };
  }, [executedSql, state]);

  return useMemo(() => {
    if (executedSql === undefined) {
      return undefined;
    }
    return () => {
      return _makeBridgeFromBaseSql({
        baseSql: executedSql,
        latestRef,
        dispatch,
      });
    };
  }, [executedSql, dispatch]);
}
