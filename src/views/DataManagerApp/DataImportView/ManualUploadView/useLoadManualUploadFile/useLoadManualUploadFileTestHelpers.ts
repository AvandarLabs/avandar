import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { vi } from "vitest";
import { TestProviders } from "@/test-utils";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  DocumentMetadata,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactNode } from "react";

/** Hoisted import dependency mocks shared by the view regression suites. */
const {
  startCsvImportMock,
  startXlsxImportMock,
  startPdfImportMock,
  transcodePdfExtractionMock,
  extractPdfRegionsMock,
  useGetPreviewDataMock,
  notifySuccessMock,
} = vi.hoisted(() => {
  return {
    startCsvImportMock: vi.fn(),
    startXlsxImportMock: vi.fn(),
    startPdfImportMock: vi.fn(),
    transcodePdfExtractionMock: vi.fn(),
    extractPdfRegionsMock: vi.fn(),
    useGetPreviewDataMock: vi.fn(),
    notifySuccessMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      startCsvImport: startCsvImportMock,
      startXlsxImport: startXlsxImportMock,
      startPdfImport: startPdfImportMock,
      transcodePdfExtraction: transcodePdfExtractionMock,
    },
  };
});

vi.mock("@/clients/datasets/pdfSniff", () => {
  return { extractPdfRegions: extractPdfRegionsMock };
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

vi.mock("@/utils/notifications/notify", () => {
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

/** Creates empty document metadata for PDF import tests. */
export function emptyDocumentMetadata(): DocumentMetadata {
  return {
    title: null,
    organisation: null,
    reportNumber: null,
    publishedAt: null,
  };
}

/** What `PdfRegionPicker` creates when the user drags a box. */
export function drawnRegion(): PdfRegion {
  return {
    id: "r1",
    label: "Region 1",
    shape: "prose_measures",
    detectionMode: "manual",
    fragments: [{ page: 0, bbox: [305, 450, 570, 615] }],
    options: {},
  };
}

/** Provides query and application contexts for manual-file hook tests. */
export function wrapper({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
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

export {
  extractPdfRegionsMock,
  notifySuccessMock,
  startCsvImportMock,
  startPdfImportMock,
  startXlsxImportMock,
  transcodePdfExtractionMock,
  useGetPreviewDataMock,
};
