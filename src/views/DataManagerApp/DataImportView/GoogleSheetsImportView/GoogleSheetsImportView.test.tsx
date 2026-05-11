import { readFileSync } from "node:fs";
import path from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  RenderOptions,
  render as renderRtl,
  screen,
  waitFor,
} from "@testing-library/react";
import { formatNumber } from "@utils/numbers/formatNumber/formatNumber";
import { uuid } from "$/lib/uuid";
import Papa from "papaparse";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIClient } from "@/clients/APIClient";
import { AvandarUiProvider } from "@/components/common/AvandarUiProvider";
import { AppConfig } from "@/config/AppConfig";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import type {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type { GPickerDocumentObject } from "@/lib/types/google-picker";
import type { APIReturnType } from "@/types/http-api.types";
import type { UnknownObject } from "@utils/types/common.types";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement } from "react";

const FIXTURE_CSV_PATH = path.resolve(
  process.cwd(),
  "tests/data/california-covid-sample.csv",
);

/**
 * Data rows in `california-covid-sample.csv` (excluding the header line).
 * The file has 14,700 lines total.
 */
const COVID_SAMPLE_NUM_ROWS = 14_700;

const {
  notifySuccessMock,
  storeLocalCSVMock,
  dropLocalDatasetMock,
  useGetPreviewDataMock,
  googlePickerHarness,
} = vi.hoisted(() => {
  const harness: {
    onSheetPicked:
      | ((params: {
          document: GPickerDocumentObject;
          googleAccount: GoogleToken;
        }) => void)
      | null;
    pickerSetVisible: ReturnType<typeof vi.fn>;
  } = {
    onSheetPicked: null,
    pickerSetVisible: vi.fn(),
  };

  return {
    notifySuccessMock: vi.fn(),
    storeLocalCSVMock: vi.fn(),
    dropLocalDatasetMock: vi.fn().mockResolvedValue(undefined),
    useGetPreviewDataMock: vi.fn(),
    googlePickerHarness: harness,
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

vi.mock("@/clients/APIClient", () => {
  return {
    APIClient: {
      get: vi.fn(),
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

vi.mock("@/clients/datasets/DatasetClient", () => {
  return {
    DatasetClient: {
      insertGoogleSheetsDataset: vi.fn(),
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

vi.mock("@/hooks/ui/useGooglePicker", () => {
  return {
    useGooglePicker: (options: {
      onGoogleSheetPicked?: (params: {
        document: GPickerDocumentObject;
        googleAccount: GoogleToken;
      }) => void;
    }) => {
      if (options.onGoogleSheetPicked) {
        googlePickerHarness.onSheetPicked = options.onGoogleSheetPicked;
      }

      const mockAccount = {
        access_token: "google-sheets-test-access-token",
        google_account_id: "00000000-0000-4000-8000-000000000099",
        google_email: "google-sheets-test@example.com",
      } as GoogleToken;

      return {
        googlePickerAPI: undefined,
        isGoogleAuthenticated: true,
        isLoadingAPI: false,
        isLoadingGoogleAuthState: false,
        picker: { setVisible: googlePickerHarness.pickerSetVisible },
        selectedGoogleAccount: mockAccount,
      };
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
          <AvandarUiProvider>{children}</AvandarUiProvider>
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
 * Metadata matching DuckDB WASM inference for `california-covid-sample.csv`
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
    type: "csv",
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
 * Rows as returned by `google-sheets/:id`, matching `california-covid-sample`.
 * Cells must be strings for `csvCellValueSchema` in the view.
 */
function _spreadsheetRowsFromCovidSampleCsv(): string[][] {
  const text = readFileSync(FIXTURE_CSV_PATH, "utf8");
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });

  return parsed.data.map((row) => {
    return row.map((cell) => {
      return String(cell);
    });
  });
}

function _simulateGoogleSheetPick(document: GPickerDocumentObject): void {
  if (!googlePickerHarness.onSheetPicked) {
    throw new Error(
      "Expected useGooglePicker to register onGoogleSheetPicked.",
    );
  }

  googlePickerHarness.onSheetPicked({
    document,
    googleAccount: {
      access_token: "google-sheets-test-access-token",
      google_account_id: "00000000-0000-4000-8000-000000000099",
      google_email: "google-sheets-test@example.com",
    } as GoogleToken,
  });
}

describe("GoogleSheetsImportView", () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000001",
      email: "google-sheets-import-test@example.com",
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
    useGetPreviewDataMock.mockClear();
    googlePickerHarness.pickerSetVisible.mockClear();

    const spreadsheetRows = _spreadsheetRowsFromCovidSampleCsv();

    vi.mocked(APIClient.get).mockImplementation((async (opts) => {
      if (opts.route === "google-sheets/:id") {
        const payload: APIReturnType<"google-sheets/:id", "GET"> = {
          availableSheets: [{ name: "Sheet1", sheetId: 0 }],
          rows: spreadsheetRows,
          sheetName: "Sheet1",
          spreadsheetName: "california-covid-sample",
        };
        return payload;
      }

      throw new Error(`Unexpected APIClient.get route: ${String(opts.route)}`);
    }) as typeof APIClient.get);

    storeLocalCSVMock.mockImplementation(async (params) => {
      return _covidSampleLoadResult({
        csvName: "california-covid-sample",
        datasetId: params.datasetId,
      });
    });

    const previewRows = _previewRowsFromCovidSample();

    useGetPreviewDataMock.mockReturnValue([previewRows]);
  });

  it("loads california-covid-sample via Sheets API, infers columns, and reports row count", async () => {
    renderWithProviders(<GoogleSheetsImportView />);

    await act(async () => {
      _simulateGoogleSheetPick({
        id: "00000000-0000-4000-8000-0000000000a1",
        name: "california-covid-sample",
      });
    });

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
