import { isDefined, prop, propEq } from "@avandar/utils";
import { useEffect, useMemo, useState } from "react";
import { probeColumnCastLoss } from "@/clients/DuckDbClient/probeColumnCastLoss/probeColumnCastLoss";
import { Logger } from "@/utils/Logger";
import type { UnknownObject } from "@avandar/utils";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** One column whose chosen type would discard part of the preview sample. */
export type ColumnCastWarning = {
  columnIdx: number;
  columnName: string;
  dataType: AvaDataType.T;
  numValues: number;
  numUncastable: number;
};

/**
 * A probe result, before the column's current name is attached to it.
 *
 * The name is deliberately not stored: a rename does not change what a cast
 * would do, so it must not cost a new probe, and a name captured when the probe
 * ran would go stale the moment the user edits it.
 */
type ProbedColumnCastLoss = Omit<ColumnCastWarning, "columnName">;

type UseColumnCastWarningsOptions = {
  columns: readonly DatasetColumn.Imported[];
  previewRows: readonly UnknownObject[];
};

/** Probes each re-typed column against the preview sample. */
async function _getCastLossForColumns(
  options: Readonly<{
    columns: readonly DatasetColumn.Imported[];
    previewRows: readonly UnknownObject[];
  }>,
): Promise<ProbedColumnCastLoss[]> {
  const { columns, previewRows } = options;
  const probed = await Promise.all(
    columns.map(async (column) => {
      const loss = await probeColumnCastLoss({
        values: previewRows.map((row) => {
          return row[column.originalName];
        }),
        targetDataType: column.dataType,
      });
      return {
        columnIdx: column.columnIdx,
        dataType: column.dataType,
        ...loss,
      };
    }),
  );
  return probed.filter((columnLoss) => {
    return columnLoss.numUncastable > 0;
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
  const [castLoss, setCastLoss] = useState<ProbedColumnCastLoss[]>([]);

  // Only the columns the user re-typed are worth probing: an inferred type is
  // by construction one every sampled value already fits.
  const userTypedColumns = options.columns.filter(prop("isDataTypeUserSet"));

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
        setCastLoss([]);
        return undefined;
      }

      let isCancelled = false;
      void _getCastLossForColumns({ columns: userTypedColumns, previewRows })
        .then((probed) => {
          if (!isCancelled) {
            setCastLoss(probed);
          }
        })
        .catch((error: unknown) => {
          // A failed probe must not block the import; the user simply does not
          // get the warning.
          Logger.error(error);
          if (!isCancelled) {
            setCastLoss([]);
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

  // The name is resolved here rather than when the probe ran, so a rename shows
  // up in the warning without re-probing. A column that disappeared from the
  // list (a re-parse) drops its warning.
  return useMemo(() => {
    return castLoss
      .map((columnLoss) => {
        const column = options.columns.find(
          propEq("columnIdx", columnLoss.columnIdx),
        );
        return isDefined(column) ?
            { ...columnLoss, columnName: column.name }
          : undefined;
      })
      .filter(isDefined);
  }, [castLoss, options.columns]);
}
