import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { act, render, screen, waitFor } from "@/test-utils";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type { GPickerDocumentObject } from "@/lib/types/google-picker";
import type { RenderOptions } from "@/test-utils";
import type { ReactElement, ReactNode } from "react";

/**
 * One Avandar dataset is one tab, so the import path lists a workbook's tabs
 * from the Sheets API and then downloads only the chosen one, as CSV.
 *
 * This suite drives **real CSV text**: the mocked export returns the fixture
 * below and the mocked sniff parses it back. Nothing here hand-writes a column
 * list, which is what would let "we shipped a tab selector and still read tab
 * one" pass. The two tabs have different columns on purpose, so an assertion
 * about one cannot hold while the other was read.
 */
export const FIRST_TAB = "Colombia";

/** Second workbook tab offered by the Sheets import fixture. */
export const SECOND_TAB = "Kenya";

/** Stable identifier of the first fixture workbook tab. */
export const FIRST_TAB_GID = 0;

/** Stable identifier of the second fixture workbook tab. */
export const SECOND_TAB_GID = 988142735;

/** CSV export bodies indexed by the fixture workbook tab identifiers. */
export const TAB_CSV: Readonly<Record<number, string>> = {
  [FIRST_TAB_GID]: "city,population\nBogota,7900000\n",
  [SECOND_TAB_GID]: "county,residents,capital\nNairobi,4400000,yes\n",
};

/** Hoisted import dependency mocks shared by the view regression suites. */
const {
  notifyErrorMock,
  startCsvImportMock,
  dropLocalDatasetMock,
  useGetPreviewDataMock,
  googlePickerHarness,
  navigateToExternalUrlMock,
  getGoogleSheetTabsMock,
  getGoogleSheetTabCsvExportMock,
} = vi.hoisted(() => {
  const harness: {
    onSheetPicked:
      | ((params: {
          document: GPickerDocumentObject;
          googleAccount: GoogleToken;
        }) => void)
      | null;
    onCancel: (() => void) | null;
    pickerSetVisible: ReturnType<typeof vi.fn>;
    picker: { setVisible: ReturnType<typeof vi.fn> } | undefined;
    isLoadingAPI: boolean;
    /**
     * Whether the mocked `useGooglePicker` reports a connected Google account.
     * A test that exercises the connect button has to set this to `false`,
     * because that branch only renders for a user with no token.
     */
    isGoogleAuthenticated: boolean;
  } = {
    onSheetPicked: null,
    onCancel: null,
    pickerSetVisible: vi.fn(),
    picker: undefined,
    isLoadingAPI: false,
    isGoogleAuthenticated: true,
  };

  return {
    notifyErrorMock: vi.fn(),
    startCsvImportMock: vi.fn(),
    dropLocalDatasetMock: vi.fn().mockResolvedValue(undefined),
    useGetPreviewDataMock: vi.fn(),
    googlePickerHarness: harness,
    navigateToExternalUrlMock: vi.fn(),
    getGoogleSheetTabsMock: vi.fn(),
    getGoogleSheetTabCsvExportMock: vi.fn(),
  };
});

vi.mock("@/utils/notifications/notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/notifications/notify")>();
  return {
    ...actual,
    notifyError: notifyErrorMock,
    notifyWarning: vi.fn(),
  };
});

vi.mock("@avandar/browser-utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@avandar/browser-utils")>();
  return { ...actual, navigateToExternalUrl: navigateToExternalUrlMock };
});

vi.mock("$/connectors/googleSheets/GoogleDriveClient/GoogleDriveClient", () => {
  return {
    getGoogleSheetTabs: getGoogleSheetTabsMock,
    getGoogleSheetTabCsvExport: getGoogleSheetTabCsvExportMock,
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return { useCurrentUser: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
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
  return { APIClient: { get: vi.fn() } };
});

vi.mock("@/clients/datasets/DatasetQueryClient", () => {
  return { DatasetQueryClient: { useGetPreviewData: useGetPreviewDataMock } };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      insertGoogleSheetsDataset: vi.fn(),
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
    return { DatasetParquetStorageClient: { startDatasetUpload: vi.fn() } };
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

vi.mock("@/hooks/ui/useGooglePicker", () => {
  return {
    useGooglePicker: (options: {
      onGoogleSheetPicked?: (params: {
        document: GPickerDocumentObject;
        googleAccount: GoogleToken;
      }) => void;
      onCancel?: () => void;
    }) => {
      if (options.onGoogleSheetPicked) {
        googlePickerHarness.onSheetPicked = options.onGoogleSheetPicked;
      }
      if (options.onCancel) {
        googlePickerHarness.onCancel = options.onCancel;
      }

      return {
        googlePickerAPI: undefined,
        isGoogleAuthenticated: googlePickerHarness.isGoogleAuthenticated,
        isLoadingAPI: googlePickerHarness.isLoadingAPI,
        isLoadingGoogleAuthState: false,
        picker: googlePickerHarness.picker,
        selectedGoogleAccount: googleAccount(),
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

/** Creates the Google account returned by the import connector fixture. */
export function googleAccount(): GoogleToken {
  return {
    access_token: "google-sheets-test-access-token",
    // A Google `sub`, which is what `tokens__google.google_account_id` stores.
    google_account_id: "108374652910384756291",
    google_email: "google-sheets-test@example.com",
  } as GoogleToken;
}

/** The tab list the Sheets API reports for the fixture workbook. */
export function fixtureTabs(): Array<{
  sheetId: number;
  title: string;
  index: number;
}> {
  return [
    { sheetId: FIRST_TAB_GID, title: FIRST_TAB, index: 0 },
    { sheetId: SECOND_TAB_GID, title: SECOND_TAB, index: 1 },
  ];
}

/** Renders the import view within its test providers. */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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

/** Delivers a selected sheet through the Google Picker test harness. */
export function simulateGoogleSheetPick(document: GPickerDocumentObject): void {
  if (!googlePickerHarness.onSheetPicked) {
    throw new Error(
      "Expected useGooglePicker to register onGoogleSheetPicked.",
    );
  }
  googlePickerHarness.onSheetPicked({
    document,
    googleAccount: googleAccount(),
  });
}

/**
 * Opens a tab `Select` and returns its options.
 *
 * Queried by the select's accessible name rather than through a Mantine class
 * hook, because two tab selects can be on screen at once: the one that chooses
 * what to import, and the form's own once a tab has been imported.
 *
 * The options are awaited rather than read in the same flush as the click.
 * Mantine mounts the dropdown into a portal on a later tick, so a synchronous
 * read passes on an idle machine and fails under a loaded full-suite run, which
 * is exactly the flake this shape removes.
 */
export async function getSelectOptions(name: RegExp): Promise<HTMLElement[]> {
  const combobox = screen.getByRole("combobox", { name });
  await act(async () => {
    fireEvent.click(combobox);
    fireEvent.focus(combobox);
  });
  // Mantine unmounts a closed dropdown, so a document-wide query returns the
  // options of the one just opened. The options are awaited rather than read in
  // the same flush as the click: the dropdown mounts into a portal on a later
  // tick, so a synchronous read passes on an idle machine and fails under a
  // loaded full-suite run.
  return await waitFor(() => {
    return screen.getAllByRole("option", { hidden: true });
  });
}

/** Opens a tab `Select` and chooses `tabName`. */
export async function chooseTabIn(
  name: RegExp,
  tabName: string,
): Promise<void> {
  const options = await getSelectOptions(name);
  const option = options.find((candidate) => {
    return candidate.textContent === tabName;
  });
  if (!option) {
    throw new Error(`The tab selector does not offer "${tabName}".`);
  }
  await act(async () => {
    fireEvent.click(option);
  });
}

/** The options offered by the pre-import tab selector. */
export async function getImportTabOptions(): Promise<HTMLElement[]> {
  return await getSelectOptions(/tab to import/i);
}

/** Chooses a tab in the pre-import selector. */
export async function chooseImportTab(tabName: string): Promise<void> {
  await chooseTabIn(/tab to import/i, tabName);
}

/** Chooses a tab in the import form's own selector, after an import. */
export async function chooseFormTab(tabName: string): Promise<void> {
  await chooseTabIn(/^tab$/i, tabName);
}

/** Presses the button that imports the selected tab. */
export async function clickProcess(): Promise<void> {
  const button = await screen.findByRole("button", { name: /^process$/i });
  await act(async () => {
    button.click();
  });
}

/** Renders the view and drives one pick through the mocked Picker. */
export async function pickTheSheet(): Promise<void> {
  renderWithProviders(<GoogleSheetsImportView />);
  await act(async () => {
    simulateGoogleSheetPick({
      id: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      name: "regional-population",
    });
  });
}

export { readFileText, sniffCsvFile } from "./GoogleSheetsCsvTestHelpers";

export {
  dropLocalDatasetMock,
  getGoogleSheetTabCsvExportMock,
  getGoogleSheetTabsMock,
  googlePickerHarness,
  navigateToExternalUrlMock,
  notifyErrorMock,
  startCsvImportMock,
  useGetPreviewDataMock,
};
