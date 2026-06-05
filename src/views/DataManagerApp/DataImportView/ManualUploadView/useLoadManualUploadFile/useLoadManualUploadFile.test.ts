import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { Expect, IsEqual } from "@utils";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ParseManualFileOptions,
  useLoadManualUploadFile,
} from "./useLoadManualUploadFile";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { UnknownObject } from "@utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { ReactNode } from "react";

const {
  startCsvImportMock,
  startXlsxImportMock,
  useGetPreviewDataMock,
  notifySuccessMock,
} = vi.hoisted(() => {
  return {
    startCsvImportMock: vi.fn(),
    startXlsxImportMock: vi.fn(),
    useGetPreviewDataMock: vi.fn(),
    notifySuccessMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      startCsvImport: startCsvImportMock,
      startXlsxImport: startXlsxImportMock,
    },
  };
});

vi.mock("@/clients/datasets/DatasetQueryClient", () => {
  return {
    DatasetQueryClient: {
      useGetPreviewData: useGetPreviewDataMock,
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "00000000-0000-4000-8000-000000000001" };
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "00000000-0000-4000-8000-000000000002" };
    },
  };
});

vi.mock("@ui", () => {
  return {
    notifySuccess: notifySuccessMock,
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
  };
});

vi.mock(import("@utils"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    formatNumber: (value: number) => {
      return String(value);
    },
  };
});

vi.mock("xlsx", () => {
  return {
    read: vi.fn(() => {
      return {
        SheetNames: ["Sheet1", "Sheet2"],
      };
    }),
  };
});

function _columnSchema(
  column_name: string,
  column_type: DuckDbColumnSchema["column_type"],
): DuckDbColumnSchema {
  return {
    column_name,
    column_type,
    default: null,
    extra: null,
    key: null,
    null: "YES",
  };
}

function _wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return createElement(
    TestProviders,
    null,
    createElement(QueryClientProvider, { client: queryClient }, children),
  );
}

describe("useLoadManualUploadFile", () => {
  it("loads csv files and stores returned metadata", async () => {
    const previewRows: UnknownObject[] = [{ city: "LA" }];
    useGetPreviewDataMock.mockReturnValue([previewRows]);
    startCsvImportMock.mockResolvedValue({
      columns: [_columnSchema("city", "VARCHAR")],
      previewRows,
      csvSniff: {
        Delimiter: ",",
        Quote: '"',
        Escape: '"',
        NewLineDelimiter: "\n",
        Comment: "",
        SkipRows: 0,
        HasHeader: true,
        Columns: [{ name: "city", type: "VARCHAR" }],
        DateFormat: null,
        TimestampFormat: null,
        UserArguments: "",
        Prompt: "",
        table_name: "dataset_csv",
      },
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: _wrapper },
    );
    const file = new File(["city\nLA"], "cities.csv", {
      type: "text/csv",
    });

    await act(async () => {
      await result.current.loadFile.async({
        type: "csv_file",
        file,
        datasetId: "dataset_csv" as Dataset.Id,
        numRowsToSkip: 1,
        delimiter: ",",
      });
    });

    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          datasetId: "dataset_csv",
        }),
      );
    });
    expect(
      result.current.dataSourceMetadata?.datasetLoadResult?.datasetId,
    ).toBe("dataset_csv");
  });

  it("keeps user csv parse options after load instead of sniff overrides", async () => {
    useGetPreviewDataMock.mockReturnValue([[]]);
    startCsvImportMock.mockResolvedValue({
      columns: [_columnSchema("city", "VARCHAR")],
      previewRows: [],
      csvSniff: {
        Delimiter: "|",
        Quote: '"',
        Escape: '"',
        NewLineDelimiter: "\n",
        Comment: "",
        SkipRows: 0,
        HasHeader: true,
        Columns: [{ name: "city", type: "VARCHAR" }],
        DateFormat: null,
        TimestampFormat: null,
        UserArguments: "",
        Prompt: "",
        table_name: "dataset_csv",
      },
      tableName: "dataset_csv",
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: _wrapper },
    );
    const file = new File(["city\nLA"], "cities.csv", {
      type: "text/csv",
    });

    await act(async () => {
      await result.current.loadFile.async({
        type: "csv_file",
        file,
        datasetId: "dataset_csv" as Dataset.Id,
        numRowsToSkip: 1,
        delimiter: ",",
      });
    });

    expect(result.current.dataSourceMetadata?.parseOptions).toEqual({
      type: "csv_file",
      numRowsToSkip: 1,
      delimiter: ",",
    });
  });

  it("loads xlsx files and includes available sheet names", async () => {
    const previewRows: UnknownObject[] = [{ city: "LA" }];
    useGetPreviewDataMock.mockReturnValue([previewRows]);
    startXlsxImportMock.mockResolvedValue({
      sheets: ["Sheet1", "Sheet2"],
      defaultSheet: "Sheet2",
      columns: ["city"],
      previewRows,
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: _wrapper },
    );
    const file = {
      name: "cities.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      arrayBuffer: async () => {
        return new ArrayBuffer(8);
      },
    } as unknown as File;

    await act(async () => {
      await result.current.loadFile.async({
        type: "xlsx_file",
        file,
        datasetId: "dataset_xlsx" as Dataset.Id,
        sheetName: "Sheet2",
      });
    });

    await waitFor(() => {
      expect(startXlsxImportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          datasetId: "dataset_xlsx",
          parseOptions: expect.objectContaining({
            sheet: "Sheet2",
            hasHeader: undefined,
          }),
        }),
      );
    });
    expect(
      result.current.dataSourceMetadata?.datasetLoadResult?.datasetId,
    ).toBe("dataset_xlsx");
    if (result.current.dataSourceMetadata?.datasetLoadResult?.type === "xlsx") {
      expect(
        result.current.dataSourceMetadata?.datasetLoadResult
          .availableSheetNames,
      ).toEqual(["Sheet1", "Sheet2"]);
    }
  });
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore ignore unused variable warning
type _TypeTests = [
  /**
   * Ensure all manually importable file types are covered here. This should
   * have no error. If there is an error here, it means that we are missing an
   * ImportableFileType in our ParseFileOptions.
   */
  Expect<
    IsEqual<
      Exclude<
        ParseManualFileOptions["type"],
        DatasetSource.ManuallyUploadableSourceType
      >,
      never
    >
  >,
];
