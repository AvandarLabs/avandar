import { useMemo } from "react";
import { match } from "ts-pattern";
import { ImportedDatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { DataSourceMetadata } from "../DatasetImportForm.types";

function _duckDbColumnsToImportedColumns(
  columns: DuckDbColumnSchema[],
): ImportedDatasetColumn[] {
  return columns.map((duckDbCol, idx) => {
    return {
      name: duckDbCol.column_name,
      originalName: duckDbCol.column_name,
      originalDataType: duckDbCol.column_type,
      detectedDataType: duckDbCol.column_type,
      dataType: DuckDbDataTypeUtils.toAvaDataType(duckDbCol.column_type),
      columnIdx: idx,
    };
  });
}

export function useImportedColumns(
  dataSourceMetadata: DataSourceMetadata,
): ImportedDatasetColumn[] {
  return useMemo(() => {
    return match(dataSourceMetadata)
      .with(
        { sourceType: "csv_file" },
        { sourceType: "xlsx_file" },
        // A PDF's columns stay empty until a region is extracted, so this
        // arm yields `[]` for a freshly-uploaded document.
        { sourceType: "pdf_file" },
        // A Google Sheets tab is downloaded as CSV, so its load result carries
        // the same top-level columns the file sources do.
        { sourceType: "google_sheets" },
        // A Postgres table/view is also transcoded through DuckDB's CSV
        // reader (connector spec section 5.4a), so its load result carries
        // the same top-level columns too.
        { sourceType: "postgres_table" },
        (metadata) => {
          return _duckDbColumnsToImportedColumns(
            metadata.datasetLoadResult.columns,
          );
        },
      )
      .exhaustive();
  }, [dataSourceMetadata]);
}
