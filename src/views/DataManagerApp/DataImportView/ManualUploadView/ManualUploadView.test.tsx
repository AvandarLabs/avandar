import { readFileSync } from "node:fs";
import path from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  RenderOptions,
  render as renderRtl,
  screen,
  waitFor,
} from "@testing-library/react";
import { formatNumber } from "@utils/numbers/formatNumber/formatNumber";
import { uuid } from "$/lib/uuid";
import Papa from "papaparse";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DuckDBClient } from "@/clients/DuckDBClient/DuckDBClient";
import { AvandarUIProvider } from "@/components/common/AvandarUIProvider";
import { AppConfig } from "@/config/AppConfig";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import type {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
} from "@/clients/DuckDBClient/DuckDBClient.types";
import type { UnknownObject } from "@utils/types/common.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement } from "react";
import type { MockInstance } from "vitest";

const FIXTURE_CSV_PATH = path.resolve(
  process.cwd(),
  "tests/data/california-covid-sample.csv",
);

/**
 * Data rows in `california-covid-sample.csv` (excluding the header line).
 * The file has 14,700 lines total.
 */
const COVID_SAMPLE_NUM_ROWS = 14_700;

const { notifySuccessMock, storeLocalCSVMock, dropLocalDatasetMock } =
  vi.hoisted(() => {
    return {
      notifySuccessMock: vi.fn(),
      storeLocalCSVMock: vi.fn(),
      dropLocalDatasetMock: vi.fn().mockResolvedValue(undefined),
    };
  });

vi.mock("@ui/notifications/notify", () => {
  return {
    notifySuccess: notifySuccessMock,
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: vi.fn(),
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient", () => {
  return {
    DatasetClient: {
      insertCSVFileDataset: vi.fn(),
      QueryKeys: {
        getAll: (): string[] => {
          return ["datasets"];
        },
      },
    },
  };
});

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return {
      DatasetParquetStorageClient: {
        startDatasetUpload: vi.fn(),
      },
    };
  },
);

vi.mock("@/clients/datasets/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      storeLocalCSV: storeLocalCSVMock,
      dropLocalDataset: dropLocalDatasetMock,
    },
  };
});

vi.mock("@/lib/ui/viz/DataGrid", async () => {
  const { createElement } = await import("react");

  return {
    DataGrid: function DataGridMock(): ReactElement {
      return createElement("div", { "data-testid": "data-grid-mock" });
    },
  };
});

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof renderRtl> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return renderRtl(ui, {
    wrapper: ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          <AvandarUIProvider>{children}</AvandarUIProvider>
        </QueryClientProvider>
      );
    },
    ...options,
  });
}

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

/**
 * Metadata matching DuckDB WASM inference for `us-covid-sample.csv`
 * (see fixture under `tests/data/`).
 */
function _covidSampleLoadResult(options: {
  datasetId: string;
  csvName: string;
}): DuckDbLoadCsvResult {
  const { datasetId, csvName } = options;
  const columns: DuckDbColumnSchema[] = [
    _columnSchema("Province_State", "VARCHAR"),
    _columnSchema("Admin2", "VARCHAR"),
    _columnSchema("Lat", "DOUBLE"),
    _columnSchema("Long_", "DOUBLE"),
    _columnSchema("date", "BIGINT"),
    _columnSchema("daily_new_cases", "INTEGER"),
  ];

  return {
    id: uuid(),
    csvName,
    numRows: COVID_SAMPLE_NUM_ROWS,
    numRejectedRows: 0,
    columns,
    errors: { rejectedScans: [], rejectedRows: [] },
    tableName: datasetId,
    csvSniff: {
      Delimiter: ",",
      Quote: `"`,
      Escape: `"`,
      NewLineDelimiter: `\n`,
      Comment: "",
      SkipRows: 0,
      HasHeader: true,
      Columns: columns.map((col) => {
        return { name: col.column_name, type: col.column_type };
      }),
      DateFormat: null,
      TimestampFormat: null,
      UserArguments: "",
      Prompt: `FROM read_csv('${datasetId}', …)`,
      table_name: datasetId,
    },
  };
}

function _previewRowsFromCovidSample(): UnknownObject[] {
  const text = readFileSync(FIXTURE_CSV_PATH, "utf8");
  const result = Papa.parse<UnknownObject>(text, {
    dynamicTyping: true,
    header: true,
    preview: AppConfig.dataManagerApp.maxPreviewRows,
    skipEmptyLines: true,
  });

  const fatalErrors = result.errors.filter((parseError) => {
    return parseError.type !== "FieldMismatch";
  });

  if (fatalErrors.length > 0) {
    const messages = fatalErrors
      .map((err) => {
        return err.message;
      })
      .join("; ");
    throw new Error(`Fixture CSV parse failed: ${messages}`);
  }

  return result.data;
}

/**
 * Full DuckDB WASM does not finish reliably in Vitest/jsdom (web workers), so
 * `LocalDatasetClient.storeLocalCSV` and `DuckDBClient.runRawQuery` use mocks.
 * Load metadata matches DuckDB inference for `tests/data/us-covid-sample.csv`.
 */
describe("ManualUploadView", () => {
  let runRawQuerySpy: MockInstance;

  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000001",
      email: "manual-upload-test@example.com",
    } as User.T);

    vi.mocked(useCurrentWorkspace).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000002",
      ownerId: "00000000-0000-4000-8000-000000000001",
      name: "Test Workspace",
      slug: "test-workspace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subscription: undefined,
    } as Workspace.WithSubscription);

    notifySuccessMock.mockClear();
    storeLocalCSVMock.mockClear();
    dropLocalDatasetMock.mockClear();

    storeLocalCSVMock.mockImplementation(async (params) => {
      const file = params.csvParseOptions.file as File | undefined;
      const csvName = file?.name ?? "fixture.csv";

      return _covidSampleLoadResult({
        datasetId: params.datasetId,
        csvName,
      });
    });

    const previewRows = _previewRowsFromCovidSample();

    const previewQueryResult: QueryResult = {
      id: uuid(),
      columns: [
        { name: "Province_State", dataType: "varchar" },
        { name: "Admin2", dataType: "varchar" },
        { name: "Lat", dataType: "double" },
        { name: "Long_", dataType: "double" },
        { name: "date", dataType: "bigint" },
        { name: "daily_new_cases", dataType: "bigint" },
      ],
      data: previewRows,
      numRows: previewRows.length,
    };

    runRawQuerySpy = vi
      .spyOn(DuckDBClient, "runRawQuery")
      .mockImplementation((async () => {
        return previewQueryResult;
      }) as unknown as typeof DuckDBClient.runRawQuery);
  });

  afterEach(() => {
    runRawQuerySpy.mockRestore();
  });

  it("parses us-covid-sample.csv, infers columns, and reports row count", async () => {
    const csvBuffer = readFileSync(FIXTURE_CSV_PATH);
    const file = new File([csvBuffer], "us-covid-sample.csv", {
      type: "text/csv",
    });

    const { container } = renderWithProviders(<ManualUploadView />);

    const hiddenFileInput = container.querySelector(
      `input[type="file"][accept="text/csv"]`,
    );
    expect(hiddenFileInput).not.toBeNull();

    fireEvent.change(hiddenFileInput!, {
      target: { files: [file] },
    });

    await waitFor(() => {
      const uploadBtn = screen.getByRole("button", { name: "Upload" });
      expect(uploadBtn).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    // expect success notification
    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });

    expect(notifySuccessMock).toHaveBeenCalledWith({
      title: "File loaded successfully",
      message: `Parsed ${formatNumber(COVID_SAMPLE_NUM_ROWS, {
        locale: "en-US",
      })} rows`,
    });

    await waitFor(() => {
      expect(screen.getByText(/6 columns were detected/)).toBeInTheDocument();
    });

    const expectedColumnNames = [
      "Province_State",
      "Admin2",
      "Lat",
      "Long_",
      "date",
      "daily_new_cases",
    ];

    expectedColumnNames.forEach((name) => {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Text").length).toBe(2);
    expect(screen.getAllByText("Number").length).toBe(2);
    expect(screen.getAllByText("Integer").length).toBe(2);
  });
});
