import { readFileSync } from "node:fs";
import path from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Papa from "papaparse";
import { vi } from "vitest";
/* oxlint-disable react-refresh/only-export-components -- Test fixtures. */
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { uuid } from "$/lib/uuid";
import { render } from "@/test-utils";
import type {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { RenderOptions } from "@/test-utils";
import type { UnknownObject } from "@avandar/utils";
import type { ReactElement, ReactNode } from "react";

/** Real CSV sample used to exercise the manual upload preview. */
export const FIXTURE_CSV_PATH = path.resolve(
  process.cwd(),
  "tests/data/california-covid-sample/california-covid-sample.csv",
);

/**
 * Data rows in `california-covid-sample.csv` (excluding the header line).
 * The file has 14,700 lines total.
 */
export const COVID_SAMPLE_NUM_ROWS = 14_700;

/** Hoisted import dependency mocks shared by the view regression suites. */
const { startCsvImportMock, dropLocalDatasetMock, requestFileFromUrlMock } =
  vi.hoisted(() => {
    return {
      startCsvImportMock: vi.fn(),
      dropLocalDatasetMock: vi.fn().mockResolvedValue(undefined),
      requestFileFromUrlMock: vi.fn(),
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

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      insertCsvFileDataset: vi.fn(),
      useGetAll: (): [[], boolean] => {
        return [[], false];
      },
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

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      startCsvImport: startCsvImportMock,
      dropLocalDataset: dropLocalDatasetMock,
    },
  };
});

vi.mock("@/clients/fileUrl/requestFileFromUrl", () => {
  return {
    requestFileFromUrl: requestFileFromUrlMock,
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

/** Renders the import view within its test providers. */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
    ...options,
  });
}

/** Creates a typed column schema for import preview tests. */
export function columnSchema(
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
export function covidSampleLoadResult(options: {
  datasetId: string;
  csvName: string;
}): DuckDbLoadCsvResult {
  const { datasetId, csvName } = options;
  const columns: DuckDbColumnSchema[] = [
    columnSchema("Province_State", "VARCHAR"),
    columnSchema("Admin2", "VARCHAR"),
    columnSchema("Lat", "DOUBLE"),
    columnSchema("Long_", "DOUBLE"),
    columnSchema("date", "BIGINT"),
    columnSchema("daily_new_cases", "INTEGER"),
  ];

  return {
    id: uuid(),
    type: "csv",
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
    parquetData: new Blob(),
  };
}

/** Reads preview rows from the real manual-upload CSV sample. */
export function previewRowsFromCovidSample(): UnknownObject[] {
  const text = readFileSync(FIXTURE_CSV_PATH, "utf8");
  const result = Papa.parse<UnknownObject>(text, {
    dynamicTyping: true,
    header: true,
    preview: GlobalAppConfig.dataManagerApp.maxPreviewRows,
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

export { dropLocalDatasetMock, requestFileFromUrlMock, startCsvImportMock };
