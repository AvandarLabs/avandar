import { useEffect, useMemo, useState } from "react";
import { probeColumnCastLoss } from "@/clients/DuckDbClient/probeColumnCastLoss/probeColumnCastLoss";
import { Logger } from "@/utils/Logger";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { UnknownObject } from "@avandar/utils";

/** One column whose chosen type would discard part of the preview sample. */
export type ColumnCastWarning = {
  columnIdx: number;
  columnName: string;
  dataType: AvaDataType.T;
  numValues: number;
  numUncastable: number;
};

type UseColumnCastWarningsOptions = {
  columns: readonly DatasetColumn.Imported[];
  previewRows: readonly UnknownObject[];
};

/**
 * Identifies the columns worth probing: only the ones the user re-typed, since
 * an inferred type is by construction one every sampled value already fits.
 */
function _getUserTypedColumns(
  columns: readonly DatasetColumn.Imported[],
): DatasetColumn.Imported[] {
  return columns.filter((column) => {
    return column.isDataTypeUserSet;
  });
}

/**
 * Reports how much of the preview each re-typed column would lose.
 *
 * A user-chosen type is applied at query time with `TRY_CAST`, which turns a
 * value it cannot convert into null instead of failing, so a wrong choice is
 * invisible until someone notices an empty column. Probing the preview rows
 * turns that into something the import form can say before the dataset is
 * saved.
 */
export function useColumnCastWarnings(
  options: Readonly<UseColumnCastWarningsOptions>,
): ColumnCastWarning[] {
  const [warnings, setWarnings] = useState<ColumnCastWarning[]>([]);
  const userTypedColumns = useMemo(() => {
    return _getUserTypedColumns(options.columns);
  }, [options.columns]);

  // Re-probed whenever the set of re-typed columns changes, keyed by the
  // column and the type asked for so an unrelated edit does not re-run it.
  const probeKey = userTypedColumns
    .map((column) => {
      return `${column.columnIdx}:${column.dataType}`;
    })
    .join(",");

  const { previewRows } = options;

  useEffect(
    function probeCastLossForUserTypedColumns() {
      if (userTypedColumns.length === 0) {
        setWarnings([]);
        return undefined;
      }

      let isCancelled = false;
      void Promise.all(
        userTypedColumns.map(async (column) => {
          const loss = await probeColumnCastLoss({
            values: previewRows.map((row) => {
              return row[column.originalName];
            }),
            targetDataType: column.dataType,
          });
          return {
            columnIdx: column.columnIdx,
            columnName: column.name,
            dataType: column.dataType,
            ...loss,
          };
        }),
      )
        .then((probed) => {
          if (isCancelled) {
            return;
          }
          setWarnings(
            probed.filter((warning) => {
              return warning.numUncastable > 0;
            }),
          );
        })
        .catch((error: unknown) => {
          // A failed probe must not block the import; the user simply does not
          // get the warning.
          Logger.error(error);
          if (!isCancelled) {
            setWarnings([]);
          }
        });

      return () => {
        isCancelled = true;
      };
    },
    // `probeKey` stands in for `userTypedColumns`: that array gets a new
    // identity on every edit to any column, including ones that cannot change
    // what a cast would do, and each re-run costs a DuckDB round trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [probeKey, previewRows],
  );

  return warnings;
}
