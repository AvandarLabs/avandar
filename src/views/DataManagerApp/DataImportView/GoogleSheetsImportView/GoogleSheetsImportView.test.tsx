import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import {
  act,
  render,
  RenderOptions,
  screen,
  waitFor,
} from "@/test-utils";
import { fireEvent } from "@testing-library/react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import { Logger } from "@/utils/Logger";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type { GPickerDocumentObject } from "@/lib/types/google-picker";
import type { APIReturnType } from "@/types/http-api.types";
import type { UnknownObject } from "@avandar/utils";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

/**
 * The import path now exports the workbook from Drive and reads it with the
 * same parser acquisition uses, so this suite drives **real workbook bytes**:
 * SheetJS writes the fixture, the mocked export returns those bytes, and the
 * mocked sniff parses them back. Nothing here hand-writes a column list or a
 * tab list, which is what would let "we shipped a tab selector and still read
 * tab one" pass.
 */

const FIRST_TAB = "Colombia";
const SECOND_TAB = "Kenya";

const {
  notifySuccessMock,
  notifyErrorMock,
  startXlsxImportMock,
  dropLocalDatasetMock,
  useGetPreviewDataMock,
  googlePickerHarness,
  navigateToExternalUrlMock,
  getGoogleSheetXlsxExportMock,
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
    notifySuccessMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    startXlsxImportMock: vi.fn(),
    dropLocalDatasetMock: vi.fn().mockResolvedValue(undefined),
    useGetPreviewDataMock: vi.fn(),
    googlePickerHarness: harness,
    navigateToExternalUrlMock: vi.fn(),
    getGoogleSheetXlsxExportMock: vi.fn(),
  };
});

vi.mock("@/utils/notifications/notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/notifications/notify")>();
  return {
    ...actual,
    notifySuccess: notifySuccessMock,
    notifyError: notifyErrorMock,
    notifyWarning: vi.fn(),
  };
});

vi.mock("@avandar/browser-utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@avandar/browser-utils")>();
  return { ...actual, navigateToExternalUrl: navigateToExternalUrlMock };
});

vi.mock("@/clients/google/GoogleDriveClient/GoogleDriveClient", () => {
  return { getGoogleSheetXlsxExport: getGoogleSheetXlsxExportMock };
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
      startXlsxImport: startXlsxImportMock,
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
        selectedGoogleAccount: _googleAccount(),
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

function _googleAccount(): GoogleToken {
  return {
    access_token: "google-sheets-test-access-token",
    // A Google `sub`, which is what `tokens__google.google_account_id` stores.
    google_account_id: "108374652910384756291",
    google_email: "google-sheets-test@example.com",
  } as GoogleToken;
}

/**
 * A two-tab workbook whose tabs have different column sets, so an assertion
 * about one tab cannot pass while the other was read.
 */
function _twoTabWorkbookBytes(): Uint8Array<ArrayBuffer> {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["city", "population"],
      ["Bogota", "7900000"],
    ]),
    FIRST_TAB,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["county", "residents", "capital"],
      ["Nairobi", "4400000", "yes"],
    ]),
    SECOND_TAB,
  );
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
  return new Uint8Array(buffer);
}

/**
 * Reads a `File`'s bytes. jsdom's `File` has no `arrayBuffer()`, so this goes
 * through `FileReader`, which jsdom does implement. Reading the real `File` the
 * view built (rather than the bytes handed to the export mock) is the point: it
 * proves the workbook survives being wrapped for the local import mutation.
 */
async function _readFileBytes(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read the workbook File"));
    };
    reader.readAsArrayBuffer(file);
  });
}

/** Parses the workbook the way the real XLSX sniff worker does. */
async function _sniffWorkbook(
  file: File,
  sheet: string | undefined,
): Promise<{
  sheets: string[];
  defaultSheet: string;
  columns: string[];
  previewRows: UnknownObject[];
}> {
  const workbook = XLSX.read(await _readFileBytes(file), { type: "array" });
  const sheetName = sheet ?? workbook.SheetNames[0]!;
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Unknown sheet ${sheetName}`);
  }
  const rows = XLSX.utils.sheet_to_json<UnknownObject>(worksheet);
  return {
    sheets: workbook.SheetNames,
    defaultSheet: workbook.SheetNames[0]!,
    columns: Object.keys(rows[0] ?? {}),
    previewRows: rows,
  };
}

function renderWithProviders(
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

function _simulateGoogleSheetPick(document: GPickerDocumentObject): void {
  if (!googlePickerHarness.onSheetPicked) {
    throw new Error(
      "Expected useGooglePicker to register onGoogleSheetPicked.",
    );
  }
  googlePickerHarness.onSheetPicked({
    document,
    googleAccount: _googleAccount(),
  });
}

/**
 * Opens the tab `Select` and returns its options.
 *
 * Queried off the document rather than through a Mantine class hook: the tab
 * selector is the only combobox this view renders, so the options are
 * unambiguous, and the assertion then depends on the accessible tree rather
 * than on Mantine's internal markup.
 *
 * The options are awaited rather than read in the same flush as the click.
 * Mantine mounts the dropdown into a portal on a later tick, so a synchronous
 * read passes on an idle machine and fails under a loaded full-suite run, which
 * is exactly the flake this shape removes.
 */
async function _getTabOptions(): Promise<HTMLElement[]> {
  await act(async () => {
    const combobox = screen.getByRole("combobox", { name: /^tab$/i });
    fireEvent.click(combobox);
    fireEvent.focus(combobox);
  });
  return await waitFor(() => {
    return screen.getAllByRole("option", { hidden: true });
  });
}

/** Opens the tab `Select` and chooses `tabName`. */
async function _chooseTab(tabName: string): Promise<void> {
  const options = await _getTabOptions();
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

/** Renders the view and drives one pick through the mocked Picker. */
async function _pickTheSheet(): Promise<void> {
  renderWithProviders(<GoogleSheetsImportView />);
  await act(async () => {
    _simulateGoogleSheetPick({
      id: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      name: "regional-population",
    });
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
    notifyErrorMock.mockClear();
    startXlsxImportMock.mockClear();
    dropLocalDatasetMock.mockClear();
    useGetPreviewDataMock.mockClear();
    navigateToExternalUrlMock.mockClear();
    getGoogleSheetXlsxExportMock.mockClear();
    googlePickerHarness.pickerSetVisible.mockClear();
    googlePickerHarness.picker = {
      setVisible: googlePickerHarness.pickerSetVisible,
    };
    googlePickerHarness.isLoadingAPI = false;
    googlePickerHarness.isGoogleAuthenticated = true;
    googlePickerHarness.onCancel = null;

    getGoogleSheetXlsxExportMock.mockResolvedValue({
      xlsxBytes: _twoTabWorkbookBytes(),
      sourceVersion: "42",
    });

    const previewRowsByCall: UnknownObject[][] = [];
    startXlsxImportMock.mockImplementation(async (params) => {
      const sniff = await _sniffWorkbook(
        params.file,
        params.parseOptions.sheet,
      );
      previewRowsByCall.push(sniff.previewRows);
      useGetPreviewDataMock.mockReturnValue([sniff.previewRows]);
      return sniff;
    });

    useGetPreviewDataMock.mockReturnValue([[]]);

    vi.mocked(APIClient.get).mockImplementation((async (opts) => {
      if (opts.route === "google-auth/auth-url") {
        const payload: APIReturnType<"google-auth/auth-url", "GET"> = {
          authorizeURL: "https://accounts.google.com/o/oauth2/v2/auth?test=1",
        };
        return payload;
      }
      throw new Error(`Unexpected APIClient.get route: ${String(opts.route)}`);
    }) as typeof APIClient.get);
  });

  it("waits for the Picker API before offering Pick", () => {
    googlePickerHarness.picker = undefined;
    googlePickerHarness.isLoadingAPI = true;

    renderWithProviders(<GoogleSheetsImportView />);

    expect(
      screen.queryByRole("button", { name: /pick google sheet/i }),
    ).not.toBeInTheDocument();
  });

  it("notifies when Pick is clicked and the Picker was never built", () => {
    googlePickerHarness.picker = undefined;
    googlePickerHarness.isLoadingAPI = false;
    const loggerError = vi.spyOn(Logger, "error").mockImplementation(() => {
      return undefined;
    });

    renderWithProviders(<GoogleSheetsImportView />);
    fireEvent.click(screen.getByRole("button", { name: /pick google sheet/i }));

    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/could not be opened/i),
      }),
    );
    expect(loggerError).toHaveBeenCalled();
    loggerError.mockRestore();
  });

  it("exports the workbook from Drive and reads its first tab", async () => {
    await _pickTheSheet();

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });

    expect(getGoogleSheetXlsxExportMock).toHaveBeenCalledWith({
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      accessToken: "google-sheets-test-access-token",
    });

    // The first tab's two columns, read out of the real workbook bytes. The
    // second tab has three, so this cannot pass having read the wrong tab.
    await waitFor(() => {
      expect(screen.getByText(/2 columns were detected/)).toBeInTheDocument();
    });
    ["city", "population"].forEach((columnName) => {
      expect(screen.getAllByText(columnName).length).toBeGreaterThan(0);
    });
  });

  it("never calls the Sheets API route", async () => {
    // Dropping `google-sheets/:id` is what removes this connector's last
    // dependency on the Sheets API, and with it the project-global 300 reads
    // per minute quota shared across every tenant.
    await _pickTheSheet();

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });

    expect(vi.mocked(APIClient.get).mock.calls).not.toContainEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: "google-sheets/:id" }),
      ]),
    );
    // Positive control: the export did happen, so a view that rendered nothing
    // cannot satisfy the assertion above.
    expect(getGoogleSheetXlsxExportMock).toHaveBeenCalledTimes(1);
  });

  it("offers every tab in the workbook and defaults to the first", async () => {
    await _pickTheSheet();

    const tabSelect = await waitFor(() => {
      return screen.getByRole("combobox", { name: /^tab$/i });
    });

    expect(tabSelect).toHaveValue(FIRST_TAB);

    // Both tabs are offered, read out of the workbook bytes rather than from a
    // hand-written list, so a selector wired to the wrong source would show the
    // wrong names here.
    const tabOptions = await _getTabOptions();
    expect(
      tabOptions.map((option) => {
        return option.textContent;
      }),
    ).toEqual([FIRST_TAB, SECOND_TAB]);
  });

  it("re-reads the chosen tab without exporting the workbook again", async () => {
    await _pickTheSheet();
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /^tab$/i }),
      ).toBeInTheDocument();
    });
    expect(startXlsxImportMock).toHaveBeenCalledTimes(1);

    await _chooseTab(SECOND_TAB);
    // Choosing a tab only records the choice; the form re-reads on an explicit
    // request, the same as the CSV and XLSX paths.
    await act(async () => {
      screen.getByRole("button", { name: /process data again/i }).click();
    });

    await waitFor(() => {
      expect(startXlsxImportMock).toHaveBeenCalledTimes(2);
    });

    // The chosen tab reaches the parser.
    expect(startXlsxImportMock.mock.calls[1]![0].parseOptions.sheet).toBe(
      SECOND_TAB,
    );
    // Positive control on the default: the first read asked for no tab, which
    // is `read_xlsx`'s first-sheet default, so a hard-coded index cannot
    // satisfy both calls.
    expect(
      startXlsxImportMock.mock.calls[0]![0].parseOptions.sheet,
    ).toBeUndefined();
    // Every tab is in the bytes already in hand, so re-reading must not spend a
    // second Drive export.
    expect(getGoogleSheetXlsxExportMock).toHaveBeenCalledTimes(1);
    // The superseded local dataset is dropped rather than left behind.
    expect(dropLocalDatasetMock).toHaveBeenCalledTimes(1);
  });

  it("shows no rows-to-skip control, which Sheets no longer supports", async () => {
    // `read_xlsx` cannot express a row skip without the sheet's exact used
    // range, and a Google Sheets user can delete preamble rows in the sheet.
    await _pickTheSheet();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /^tab$/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByLabelText(/number of rows to skip/i),
    ).not.toBeInTheDocument();
    // Positive control: the header-row control for this source type is present,
    // so the query above is not failing because no controls render at all.
    expect(
      screen.getByRole("checkbox", { name: /the tab has a header row/i }),
    ).toBeInTheDocument();
  });

  it("clears the picked document when the user dismisses the Picker", async () => {
    await _pickTheSheet();

    await waitFor(() => {
      expect(
        screen.getByText(/Selected document: regional-population/),
      ).toBeInTheDocument();
    });

    notifySuccessMock.mockClear();

    if (!googlePickerHarness.onCancel) {
      throw new Error("Expected useGooglePicker to register onCancel.");
    }
    const { onCancel } = googlePickerHarness;
    await act(async () => {
      onCancel();
    });

    expect(
      screen.queryByText(/Selected document: regional-population/),
    ).not.toBeInTheDocument();
    // A dismissal is not a failure, so nothing is announced. The pick above is
    // the positive control: it did notify, so a silent view cannot pass this.
    expect(notifySuccessMock).not.toHaveBeenCalled();
  });

  it("names the failure when Drive refuses the export as too large", async () => {
    const { GoogleDriveError } = await import(
      "@/clients/google/GoogleDriveClient/GoogleDriveError"
    );
    getGoogleSheetXlsxExportMock.mockRejectedValue(
      new GoogleDriveError({
        code: "export-too-large",
        status: 403,
        reason: "exportSizeLimitExceeded",
      }),
    );

    await _pickTheSheet();

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("10 MB"),
        }),
      );
    });
    expect(notifySuccessMock).not.toHaveBeenCalled();
  });

  it("tells the user to re-pick when the per-file grant is gone", async () => {
    const { GoogleDriveError } = await import(
      "@/clients/google/GoogleDriveClient/GoogleDriveError"
    );
    getGoogleSheetXlsxExportMock.mockRejectedValue(
      new GoogleDriveError({ code: "file-not-accessible", status: 404 }),
    );

    await _pickTheSheet();

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Pick the sheet again"),
        }),
      );
    });
  });

  describe("the connect-to-Google button", () => {
    beforeEach(() => {
      // The connect button only renders for a user who has no Google token.
      googlePickerHarness.isGoogleAuthenticated = false;
    });

    it("starts the consent flow for a user with no Google token", async () => {
      // The connector shipped hard-disabled behind a maintenance tooltip, which
      // made the OAuth consent flow unreachable and so made a fresh
      // `drive.file` grant impossible. This is the test that pins it open.
      //
      // There is deliberately no assertion that the maintenance tooltip is
      // gone. Mantine renders a `Tooltip`'s label only on hover, so
      // `queryByText(/under maintenance/i)` finds nothing whether or not the
      // wrapper is there: a mutation that restored the tooltip passed such an
      // assertion. `toBeEnabled` below is the assertion that has teeth, because
      // the tooltip only ever mattered as a carrier for `disabled`.
      renderWithProviders(<GoogleSheetsImportView />);

      const button = screen.getByRole("button", {
        name: /connect to google sheets/i,
      });

      expect(button).toBeEnabled();

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(navigateToExternalUrlMock).toHaveBeenCalledWith(
          "https://accounts.google.com/o/oauth2/v2/auth?test=1",
        );
      });
    });
  });
});
