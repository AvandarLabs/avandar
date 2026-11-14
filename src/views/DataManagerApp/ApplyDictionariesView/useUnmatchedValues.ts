import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { useMemo } from "react";
import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import { getRawValuesViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { toValueKey } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { buildMatchConversion } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import { useTaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { UnmatchedValue } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { TaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";

/** The most values listed per column, most rows first. */
export const MAX_UNMATCHED_VALUES = 100;

/** Each coded column's values that no pair matches, by column id. */
export type UnmatchedValues = TaggedRead<
  ReadonlyMap<string, readonly UnmatchedValue[]>
>;

type UnmatchedRequest = {
  column: DatasetColumn.T;
  conversion: ColumnConversion.T;
};

function _buildRequests(
  options: Readonly<{
    columns: readonly DatasetColumn.T[];
    picks: Readonly<Record<string, ColumnPick>>;
    codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
  }>,
): UnmatchedRequest[] {
  return options.columns.flatMap((column) => {
    const pick = options.picks[column.id];
    const codeList = pick?.codeListId
      ? options.codeLists.get(pick.codeListId)
      : undefined;
    return pick && codeList
      ? [
          {
            column,
            conversion: buildMatchConversion({ column, pick, codeList }),
          },
        ]
      : [];
  });
}

async function _readColumn(
  options: Readonly<{
    workspaceId: Workspace.Id;
    datasetId: Dataset.Id;
    request: UnmatchedRequest;
  }>,
): Promise<UnmatchedValue[]> {
  const { column, conversion } = options.request;
  const result = await WorkspaceQuerySession.runQuery<{
    value: unknown;
    rows: unknown;
  }>({
    workspaceId: options.workspaceId,
    neededColumnsByDatasetId: { [options.datasetId]: [column.name] },
    rawSql: ColumnConversion.toUnmatchedValuesSql({
      relationSql: quoteSqlIdentifier(getRawValuesViewName(options.datasetId)),
      valueSql: quoteSqlIdentifier(column.name),
      conversion,
      limit: MAX_UNMATCHED_VALUES,
    }),
  });
  return result.data.map((row) => {
    const value = String(row.value);
    return { value, valueKey: toValueKey(value), rowCount: Number(row.rows) };
  });
}

/**
 * Reads, on this device, each picked column's values that no pair in its
 * code list matches, with their row counts: the values the Unmatched
 * values step resolves. It reads the values as stored, and compares them
 * in SQL exactly as the conversion will. A reply for picks that have since
 * changed is dropped.
 */
export function useUnmatchedValues(
  options: Readonly<{
    dataset: Dataset.T | undefined;
    columns: readonly DatasetColumn.T[] | undefined;
    picks: Readonly<Record<string, ColumnPick>>;
    codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
  }>,
): UnmatchedValues {
  const workspace = useCurrentWorkspace();
  const { columns, picks, codeLists } = options;
  const datasetId = options.dataset?.id;
  const requests = useMemo(() => {
    return _buildRequests({ columns: columns ?? [], picks, codeLists });
  }, [columns, picks, codeLists]);
  const key =
    datasetId && columns
      ? JSON.stringify([
          datasetId,
          ...requests.map((request) => {
            return [request.column.id, request.column.name, request.conversion];
          }),
        ])
      : undefined;
  return useTaggedRead({
    key,
    devMsg: "Reading unmatched values failed",
    read: async () => {
      const entries = await Promise.all(
        requests.map(async (request) => {
          // `read` runs only with a key, and a key needs a dataset.
          const values = datasetId
            ? await _readColumn({
                workspaceId: workspace.id,
                datasetId,
                request,
              })
            : [];
          return [request.column.id, values] as const;
        }),
      );
      return new Map(entries);
    },
  });
}
