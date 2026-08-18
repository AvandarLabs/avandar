import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { makeImportedColumnsFromDuckDbSchema } from "@/clients/datasets/DatasetClient/makeImportedColumnsFromDuckDbSchema/makeImportedColumnsFromDuckDbSchema";
import { applyImportedColumnEdits } from "./applyImportedColumnEdits/applyImportedColumnEdits";
import { getImportedColumnErrors } from "./getImportedColumnErrors/getImportedColumnErrors";
import { useColumnEdits } from "./useColumnEdits/useColumnEdits";
import type { DataSourceMetadata } from "../DatasetImportForm.types";
import type { ImportedColumnEdit } from "./applyImportedColumnEdits/applyImportedColumnEdits";
import type { ImportedColumnError } from "./getImportedColumnErrors/getImportedColumnErrors";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The columns of a pending import, plus the means to edit them. */
export type ImportedColumnsState = {
  /** The inferred columns with any of the user's edits applied. */
  columns: DatasetColumn.Imported[];

  /**
   * Whether this source lets the user edit its columns at all. Sources whose
   * column metadata belongs to someone else (open data's shared catalog) are
   * read-only here.
   */
  isEditable: boolean;

  /** Name problems that must be resolved before the dataset can be saved. */
  errors: ImportedColumnError[];

  /** Records an edit against the column with this `columnIdx`. */
  updateColumn: (columnIdx: number, edit: Readonly<ImportedColumnEdit>) => void;
};

function _getInferredColumns(
  dataSourceMetadata: DataSourceMetadata,
): DatasetColumn.Imported[] {
  return match(dataSourceMetadata)
    .with(
      { sourceType: "csv_file" },
      { sourceType: "xlsx_file" },
      (metadata) => {
        return makeImportedColumnsFromDuckDbSchema(
          metadata.datasetLoadResult.columns,
        );
      },
    )
    .with({ sourceType: "google_sheets" }, (metadata) => {
      return makeImportedColumnsFromDuckDbSchema(
        metadata.datasetLoadResult.sheetLoadMetadata.columns,
      );
    })
    .exhaustive();
}

/**
 * Identifies the parse that produced the current columns.
 *
 * A re-parse mints a new load result, which is how edits made against the
 * previous inference are recognized as stale.
 */
function _getLoadResultId(dataSourceMetadata: DataSourceMetadata): string {
  return match(dataSourceMetadata)
    .with(
      { sourceType: "csv_file" },
      { sourceType: "xlsx_file" },
      (metadata) => {
        return metadata.datasetLoadResult.id;
      },
    )
    .with({ sourceType: "google_sheets" }, (metadata) => {
      return metadata.datasetLoadResult.sheetLoadMetadata.id;
    })
    .exhaustive();
}

/**
 * Holds the columns of a not-yet-saved import and lets the user correct them.
 *
 * Inference runs on a sample, so it gets types wrong often enough that the user
 * needs to fix them, and it is much cheaper to fix here than after saving. The
 * edits cost nothing to apply: the parquet keeps the source's own names and
 * types either way, and the rename or cast lives in the view built over it, so
 * nothing has to be re-parsed or re-materialized when a column changes.
 *
 * Edits are held against the parse that produced them, so re-parsing with a
 * different delimiter or sheet discards them rather than silently reapplying
 * choices made about a different set of columns.
 */
export function useImportedColumns(
  dataSourceMetadata: DataSourceMetadata,
): ImportedColumnsState {
  const inferredColumns = useMemo(() => {
    return _getInferredColumns(dataSourceMetadata);
  }, [dataSourceMetadata]);
  const { activeEdits, updateColumn } = useColumnEdits(
    _getLoadResultId(dataSourceMetadata),
  );

  const columns = useMemo(() => {
    return applyImportedColumnEdits({
      baseColumns: inferredColumns,
      editsByColumnIdx: activeEdits,
    });
  }, [inferredColumns, activeEdits]);

  const errors = useMemo(() => {
    return getImportedColumnErrors(columns);
  }, [columns]);

  return {
    columns,
    errors,
    isEditable:
      DatasetSource.supportsImportTimeColumnEditing(dataSourceMetadata),
    updateColumn,
  };
}
