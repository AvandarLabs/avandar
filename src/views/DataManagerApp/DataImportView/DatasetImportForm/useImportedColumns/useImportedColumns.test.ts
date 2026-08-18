/** Tests import-form column inference, edits, and name errors. */

import { prop } from "@avandar/utils";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useImportedColumns } from "./useImportedColumns";
import type {
  CsvFileLoadResult,
  XlsxFileLoadResult,
} from "../../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type { DataSourceMetadata } from "../DatasetImportForm.types";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";

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
    parseOptions: { type: "google_sheets" },
    datasetLoadResult: {
      datasetId: DATASET_ID,
      numRows: 1,
      rawText: "a,b\n1,2",
      spreadsheetName: "sheet-name",
      sheetLoadMetadata: {
        type: "csv",
        id: "00000000-0000-4000-8000-000000000003" as CsvFileLoadResult["id"],
        csvName: "google-sheet.csv",
        numRows: 1,
        numRejectedRows: 0,
        columns,
        errors: { rejectedScans: [], rejectedRows: [] },
        tableName: "temp_google_sheet_table",
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
      },
    },
  };
}

describe("useImportedColumns", () => {
  it("maps csv_file DuckDB columns to imported columns", () => {
    const metadata = _csvFileMetadata([
      _duckDbColumn("user_id", "BIGINT"),
      _duckDbColumn("label", "VARCHAR"),
    ]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current.columns).toEqual([
      {
        name: "user_id",
        originalName: "user_id",
        originalDataType: "BIGINT",
        detectedDataType: "BIGINT",
        dataType: "bigint",
        isDataTypeUserSet: false,
        columnIdx: 0,
      },
      {
        name: "label",
        originalName: "label",
        originalDataType: "VARCHAR",
        detectedDataType: "VARCHAR",
        dataType: "varchar",
        isDataTypeUserSet: false,
        columnIdx: 1,
      },
    ]);
  });

  it("maps xlsx_file DuckDB columns the same way as csv_file", () => {
    const metadata = _xlsxFileMetadata([_duckDbColumn("amount", "DOUBLE")]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current.columns).toEqual([
      {
        name: "amount",
        originalName: "amount",
        originalDataType: "DOUBLE",
        detectedDataType: "DOUBLE",
        dataType: "double",
        isDataTypeUserSet: false,
        columnIdx: 0,
      },
    ]);
  });

  it("maps google_sheets DuckDB columns using the CSV load shape", () => {
    const metadata = _googleSheetsMetadata([_duckDbColumn("flag", "BOOLEAN")]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current.columns).toEqual([
      {
        name: "flag",
        originalName: "flag",
        originalDataType: "BOOLEAN",
        detectedDataType: "BOOLEAN",
        dataType: "boolean",
        isDataTypeUserSet: false,
        columnIdx: 0,
      },
    ]);
  });

  it("returns no columns when the source has none", () => {
    const metadata = _csvFileMetadata([]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current.columns).toEqual([]);
  });

  it("returns a stable columns reference when metadata is unchanged", () => {
    const metadata = _csvFileMetadata([_duckDbColumn("a", "VARCHAR")]);

    const { result, rerender } = renderHook(
      (props: { metadata: DataSourceMetadata }) => {
        return useImportedColumns(props.metadata);
      },
      { initialProps: { metadata } },
    );

    const first = result.current.columns;
    rerender({ metadata });
    expect(result.current.columns).toBe(first);
  });

  it("marks file and sheet imports as editable", () => {
    const column = _duckDbColumn("a", "VARCHAR");
    const editableSources = [
      _csvFileMetadata([column]),
      _xlsxFileMetadata([column]),
      _googleSheetsMetadata([column]),
    ];

    editableSources.forEach((metadata) => {
      const { result } = renderHook(() => {
        return useImportedColumns(metadata);
      });

      expect(result.current.isEditable).toBe(true);
    });
  });

  it("applies a rename and keeps the source name for the parquet", () => {
    const metadata = _csvFileMetadata([_duckDbColumn("cty", "VARCHAR")]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    act(() => {
      result.current.updateColumn(0, { name: "City" });
    });

    expect(result.current.columns[0]?.name).toBe("City");
    expect(result.current.columns[0]?.originalName).toBe("cty");
  });

  it("records a type the user chose as an override", () => {
    const metadata = _csvFileMetadata([_duckDbColumn("when", "VARCHAR")]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    act(() => {
      result.current.updateColumn(0, { dataType: "date" });
    });

    expect(result.current.columns[0]?.dataType).toBe("date");
    expect(result.current.columns[0]?.isDataTypeUserSet).toBe(true);
    expect(result.current.columns[0]?.detectedDataType).toBe("VARCHAR");
  });

  it("merges successive edits to the same column", () => {
    const metadata = _csvFileMetadata([_duckDbColumn("when", "VARCHAR")]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    act(() => {
      result.current.updateColumn(0, { name: "Recorded On" });
    });
    act(() => {
      result.current.updateColumn(0, { dataType: "timestamp" });
    });

    expect(result.current.columns[0]?.name).toBe("Recorded On");
    expect(result.current.columns[0]?.dataType).toBe("timestamp");
  });

  it("reports a duplicate name so the form can block the save", () => {
    const metadata = _csvFileMetadata([
      _duckDbColumn("a", "VARCHAR"),
      _duckDbColumn("b", "VARCHAR"),
    ]);

    const { result } = renderHook(() => {
      return useImportedColumns(metadata);
    });

    expect(result.current.errors).toEqual([]);

    act(() => {
      result.current.updateColumn(1, { name: "a" });
    });

    expect(result.current.errors.map(prop("kind"))).toEqual([
      "duplicate_name",
      "duplicate_name",
    ]);
  });

  it("keeps edits when a rerender hands over the same parse", () => {
    const { result, rerender } = renderHook(
      (props: { metadata: DataSourceMetadata }) => {
        return useImportedColumns(props.metadata);
      },
      {
        initialProps: {
          metadata: _csvFileMetadata([_duckDbColumn("cty", "VARCHAR")]),
        },
      },
    );

    act(() => {
      result.current.updateColumn(0, { name: "City", dataType: "date" });
    });

    // A new metadata object carrying the same load result id: the parse did not
    // change, so the user's edits must survive.
    rerender({
      metadata: _csvFileMetadata([_duckDbColumn("cty", "VARCHAR")]),
    });

    expect(result.current.columns[0]?.name).toBe("City");
    expect(result.current.columns[0]?.dataType).toBe("date");
    expect(result.current.columns[0]?.isDataTypeUserSet).toBe(true);
  });

  it("discards edits when a re-parse mints a new load result", () => {
    const firstParse = _csvFileMetadata([_duckDbColumn("cty", "VARCHAR")]);

    const { result, rerender } = renderHook(
      (props: { metadata: DataSourceMetadata }) => {
        return useImportedColumns(props.metadata);
      },
      { initialProps: { metadata: firstParse } },
    );

    act(() => {
      result.current.updateColumn(0, { name: "City", dataType: "date" });
    });
    expect(result.current.columns[0]?.name).toBe("City");

    // A re-parse mints a new load result id for the same column names.
    const reparsed = _csvFileMetadata([_duckDbColumn("cty", "VARCHAR")]);
    rerender({
      metadata: {
        ...reparsed,
        datasetLoadResult: {
          ...(reparsed as typeof firstParse).datasetLoadResult,
          id: "00000000-0000-4000-8000-000000000099" as CsvFileLoadResult["id"],
        },
      } as DataSourceMetadata,
    });

    expect(result.current.columns[0]?.name).toBe("cty");
    expect(result.current.columns[0]?.dataType).toBe("varchar");
    expect(result.current.columns[0]?.isDataTypeUserSet).toBe(false);
  });
});
