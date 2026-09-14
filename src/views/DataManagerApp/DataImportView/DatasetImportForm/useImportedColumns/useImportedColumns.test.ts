import { describe, expect, it } from "vitest";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { renderHook } from "@/test-utils";
import { useImportedColumns } from "./useImportedColumns";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type {
  CsvFileLoadResult,
  XlsxFileLoadResult,
} from "../../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type { DataSourceMetadata } from "../DatasetImportForm.types";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";

const DATASET_ID = "11111111-1111-1111-1111-111111111111" as Dataset.Id;

function _duckDbColumn(
  columnName: string,
  columnType: DuckDbDataType,
): DuckDbColumnSchema {
  return {
    column_name: columnName,
    column_type: columnType,
    default: null,
    extra: null,
    key: null,
    null: "YES",
  };
}

function _csvFileMetadata(columns: DuckDbColumnSchema[]): DataSourceMetadata {
  const loadResult: CsvFileLoadResult = {
    type: "csv",
    id: "00000000-0000-4000-8000-000000000001" as CsvFileLoadResult["id"],
    csvName: "test.csv",
    numRows: 1,
    numRejectedRows: 0,
    columns,
    errors: { rejectedScans: [], rejectedRows: [] },
    tableName: "temp_csv_table",
    csvSniff: {
      Delimiter: ",",
      Quote: '"',
      Escape: '"',
      NewLineDelimiter: "\n",
      Comment: "#",
      SkipRows: 0,
      HasHeader: true,
      Columns: [],
      DateFormat: null,
      TimestampFormat: null,
      UserArguments: "",
      Prompt: "",
      table_name: "temp_csv_table",
    },
    datasetId: DATASET_ID,
    parquetData: new Blob(),
  };

  return {
    sourceType: "csv_file",
    onlineStorageAllowed: true,
    sizeInBytes: 0,
    parseOptions: { type: "csv_file" },
    datasetLoadResult: loadResult,
  };
}

function _xlsxFileMetadata(columns: DuckDbColumnSchema[]): DataSourceMetadata {
  const loadResult: XlsxFileLoadResult = {
    type: "xlsx",
    id: "00000000-0000-4000-8000-000000000002" as XlsxFileLoadResult["id"],
    tableName: "temp_xlsx_table",
    xlsxName: "test.xlsx",
    numRows: 1,
    columns,
    sheet: "Sheet1",
    availableSheetNames: ["Sheet1"],
    datasetId: DATASET_ID,
    parquetData: new Blob(),
  };

  return {
    sourceType: "xlsx_file",
    onlineStorageAllowed: true,
    sizeInBytes: 0,
    parseOptions: { type: "xlsx_file" },
    datasetLoadResult: loadResult,
  };
}

function _googleSheetsMetadata(
  columns: DuckDbColumnSchema[],
): DataSourceMetadata {
  return {
    sourceType: "google_sheets",
    googleAccountId: "google-account",
    googleDocumentId: "google-doc",
    parseOptions: { type: "google_sheets", sheetName: "Kenya" },
    datasetLoadResult: {
      datasetId: DATASET_ID,
      numRows: 1,
      type: "csv",
      id: "00000000-0000-4000-8000-000000000003" as CsvFileLoadResult["id"],
      csvName: "google-sheet - Kenya.csv",
      tableName: "temp_google_sheet_table",
      numRejectedRows: 0,
      errors: { rejectedScans: [], rejectedRows: [] },
      columns,
      csvSniff: {
        Delimiter: ",",
        Quote: '"',
        Escape: '"',
        NewLineDelimiter: "\n",
        Comment: "#",
        SkipRows: 0,
        HasHeader: true,
        Columns: [],
        DateFormat: null,
        TimestampFormat: null,
        UserArguments: "",
        Prompt: "",
        table_name: "temp_google_sheet_table",
      },
      parquetData: new Blob(),
      spreadsheetName: "sheet-name",
      availableTabs: [
        { sheetId: 1, title: "Colombia", index: 0 },
        { sheetId: 2, title: "Kenya", index: 1 },
      ],
      sheetId: 2,
      sheetName: "Kenya",
      previewRows: [],
    },
  };
}

describe("useImportedColumns", () => {
  it("maps csv_file DuckDB columns to imported columns", () => {
    const columns = [
      _duckDbColumn("user_id", "BIGINT"),
      _duckDbColumn("label", "VARCHAR"),
    ];
    const metadata = _csvFileMetadata(columns);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current).toEqual([
      {
        name: "user_id",
        originalName: "user_id",
        originalDataType: "BIGINT",
        detectedDataType: "BIGINT",
        dataType: "bigint",
        columnIdx: 0,
      },
      {
        name: "label",
        originalName: "label",
        originalDataType: "VARCHAR",
        detectedDataType: "VARCHAR",
        dataType: "varchar",
        columnIdx: 1,
      },
    ]);
  });

  it("maps xlsx_file DuckDB columns the same way as csv_file", () => {
    const columns = [_duckDbColumn("amount", "DOUBLE")];
    const metadata = _xlsxFileMetadata(columns);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current).toEqual([
      {
        name: "amount",
        originalName: "amount",
        originalDataType: "DOUBLE",
        detectedDataType: "DOUBLE",
        dataType: "double",
        columnIdx: 0,
      },
    ]);
  });

  it("maps google_sheets DuckDB columns using the XLSX load shape", () => {
    const columns = [_duckDbColumn("flag", "BOOLEAN")];
    const metadata = _googleSheetsMetadata(columns);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current).toEqual([
      {
        name: "flag",
        originalName: "flag",
        originalDataType: "BOOLEAN",
        detectedDataType: "BOOLEAN",
        dataType: "boolean",
        columnIdx: 0,
      },
    ]);
  });

  it("returns an empty array when there are no columns", () => {
    const metadata = _csvFileMetadata([]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current).toEqual([]);
  });

  it("returns a stable array reference when metadata is unchanged", () => {
    const metadata = _csvFileMetadata([_duckDbColumn("a", "VARCHAR")]);

    const { result, rerender } = renderHook(
      (props: { metadata: DataSourceMetadata }) => {
        return useImportedColumns(props.metadata);
      },
      { initialProps: { metadata } },
    );

    const first = result.current;
    rerender({ metadata });
    expect(result.current).toBe(first);
  });
});
