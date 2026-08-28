import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { act, render, RenderOptions, screen, waitFor } from "@/test-utils";
import { Logger } from "@/utils/Logger";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type { GPickerDocumentObject } from "@/lib/types/google-picker";
import type { APIReturnType } from "@/types/http-api.types";
import type { UnknownObject } from "@avandar/utils";
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

const FIRST_TAB = "Colombia";
const SECOND_TAB = "Kenya";
const FIRST_TAB_GID = 0;
const SECOND_TAB_GID = 988142735;

const TAB_CSV: Readonly<Record<number, string>> = {
  [FIRST_TAB_GID]: "city,population\nBogota,7900000\n",
  [SECOND_TAB_GID]: "county,residents,capital\nNairobi,4400000,yes\n",
};

const {
  notifySuccessMock,
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
    notifySuccessMock: vi.fn(),
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

/** The tab list the Sheets API reports for the fixture workbook. */
function _fixtureTabs(): Array<{
  sheetId: number;
  title: string;
  index: number;
}> {
  return [
    { sheetId: FIRST_TAB_GID, title: FIRST_TAB, index: 0 },
    { sheetId: SECOND_TAB_GID, title: SECOND_TAB, index: 1 },
  ];
}

/**
 * Reads a `File`'s text. jsdom's `File` has no `text()`, so this goes through
 * `FileReader`, which jsdom does implement. Reading the real `File` the view
 * built, rather than the string handed to the export mock, is the point: it
 * proves the CSV survives being wrapped for the local import mutation.
 */
async function _readFileText(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read the CSV File"));
    };
    reader.readAsText(file);
  });
}

/** Parses CSV text the way the real DuckDB CSV sniff does, near enough. */
async function _sniffCsvFile(file: File): Promise<{
  columns: Array<{ column_name: string; column_type: string }>;
  previewRows: UnknownObject[];
  csvSniff: UnknownObject;
}> {
  const text = await _readFileText(file);
  const [headerLine, ...rowLines] = text.trim().split("\n");
  const columnNames = (headerLine ?? "").split(",");
  const previewRows = rowLines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(
      columnNames.map((name, index) => {
        return [name, cells[index]];
      }),
    ) as UnknownObject;
  });
  return {
    columns: columnNames.map((name) => {
      return { column_name: name, column_type: "VARCHAR" };
    }),
    previewRows,
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
      table_name: "sniffed",
    } as UnknownObject,
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
async function _getSelectOptions(name: RegExp): Promise<HTMLElement[]> {
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
async function _chooseTabIn(name: RegExp, tabName: string): Promise<void> {
  const options = await _getSelectOptions(name);
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
async function _getImportTabOptions(): Promise<HTMLElement[]> {
  return await _getSelectOptions(/tab to import/i);
}

/** Chooses a tab in the pre-import selector. */
async function _chooseImportTab(tabName: string): Promise<void> {
  await _chooseTabIn(/tab to import/i, tabName);
}

/** Chooses a tab in the import form's own selector, after an import. */
async function _chooseFormTab(tabName: string): Promise<void> {
  await _chooseTabIn(/^tab$/i, tabName);
}

/** Presses the button that imports the selected tab. */
async function _clickProcess(): Promise<void> {
  const button = await screen.findByRole("button", { name: /^process$/i });
  await act(async () => {
    button.click();
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
    startCsvImportMock.mockClear();
    dropLocalDatasetMock.mockClear();
    useGetPreviewDataMock.mockClear();
    navigateToExternalUrlMock.mockClear();
    getGoogleSheetTabsMock.mockClear();
    getGoogleSheetTabCsvExportMock.mockClear();
    googlePickerHarness.pickerSetVisible.mockClear();
    googlePickerHarness.picker = {
      setVisible: googlePickerHarness.pickerSetVisible,
    };
    googlePickerHarness.isLoadingAPI = false;
    googlePickerHarness.isGoogleAuthenticated = true;
    googlePickerHarness.onCancel = null;

    getGoogleSheetTabsMock.mockResolvedValue(_fixtureTabs());
    getGoogleSheetTabCsvExportMock.mockImplementation(
      async (params: { sheetId: number }) => {
        return { csvText: TAB_CSV[params.sheetId] ?? "", sourceVersion: "42" };
      },
    );

    startCsvImportMock.mockImplementation(async (params) => {
      const sniff = await _sniffCsvFile(params.file);
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

  it("lists the tabs and downloads nothing until one is chosen", async () => {
    // The whole point of listing tabs from the Sheets API's properties-only
    // read: the user is asked which tab to import before any cell is fetched.
    await _pickTheSheet();

    await waitFor(() => {
      expect(getGoogleSheetTabsMock).toHaveBeenCalledWith({
        fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
        accessToken: "google-sheets-test-access-token",
      });
    });

    expect(
      await screen.findByRole("button", { name: /^process$/i }),
    ).toBeInTheDocument();
    expect(getGoogleSheetTabCsvExportMock).not.toHaveBeenCalled();
    expect(startCsvImportMock).not.toHaveBeenCalled();
  });

  it("imports a one-tab workbook without asking which tab", async () => {
    // Nothing to ask, so nothing is asked: this is the flow the connector had
    // before tabs were selectable, and it must not grow a click.
    getGoogleSheetTabsMock.mockResolvedValue([
      { sheetId: FIRST_TAB_GID, title: FIRST_TAB, index: 0 },
    ]);

    await _pickTheSheet();

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledWith({
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      sheetId: FIRST_TAB_GID,
      accessToken: "google-sheets-test-access-token",
    });
    expect(
      screen.queryByRole("button", { name: /^process$/i }),
    ).not.toBeInTheDocument();
  });

  it("downloads only the tab the user picked", async () => {
    await _pickTheSheet();
    await _chooseImportTab(SECOND_TAB);
    await _clickProcess();

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });

    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledTimes(1);
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledWith({
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      sheetId: SECOND_TAB_GID,
      accessToken: "google-sheets-test-access-token",
    });

    // The second tab's three columns, read out of the CSV that tab returned.
    // The first tab has two, so this cannot pass having read the wrong tab.
    await waitFor(() => {
      expect(screen.getByText(/3 columns were detected/)).toBeInTheDocument();
    });
    ["county", "residents", "capital"].forEach((columnName) => {
      expect(screen.getAllByText(columnName).length).toBeGreaterThan(0);
    });
  });

  it("never calls the Sheets API route", async () => {
    // Dropping `google-sheets/:id` is what removes this connector's dependency
    // on our own Sheets proxy, and with it the project-global 300 reads per
    // minute quota shared across every tenant. The tab list goes straight to
    // Google on the Picker's per-file grant instead.
    await _pickTheSheet();
    await _clickProcess();

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });

    expect(vi.mocked(APIClient.get).mock.calls).not.toContainEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: "google-sheets/:id" }),
      ]),
    );
    // Positive control: the tab list and the download did happen, so a view
    // that rendered nothing cannot satisfy the assertion above.
    expect(getGoogleSheetTabsMock).toHaveBeenCalledTimes(1);
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledTimes(1);
  });

  it("offers every tab and defaults to the first", async () => {
    await _pickTheSheet();

    const tabSelect = await waitFor(() => {
      return screen.getByRole("combobox", { name: /tab to import/i });
    });
    expect(tabSelect).toHaveValue(FIRST_TAB);

    const tabOptions = await _getImportTabOptions();
    expect(
      tabOptions.map((option) => {
        return option.textContent;
      }),
    ).toEqual([FIRST_TAB, SECOND_TAB]);
  });

  it("shows the preview from the sniff, not from a query of the new table", async () => {
    // The sniff hands back the preview rows already. Asking DuckDB for them
    // instead means selecting from a table named after a dataset the sniff has
    // not materialized yet, so the form's gate never opens: the user is told
    // the rows parsed and then shown nothing. `useGetPreviewData` returning
    // `undefined` is what that looks like, and the form must render anyway.
    useGetPreviewDataMock.mockReturnValue([undefined]);

    await _pickTheSheet();
    await _clickProcess();

    expect(
      await screen.findByText("These are the first", { exact: false }),
    ).toBeInTheDocument();
  });

  it("names the CSV after the picked sheet and its tab", async () => {
    // The name reaches the parser as the file name and the dataset's default
    // name, so reading it from picker state made the very first import fall
    // back to the placeholder: the mutation closes over the render that ran
    // *before* the pick was recorded. On a second pick the same closure
    // supplies the previous sheet's name, which is worse than a placeholder
    // because it looks correct.
    await _pickTheSheet();
    await _clickProcess();

    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledTimes(1);
    });
    expect(startCsvImportMock.mock.calls[0]![0].file.name).toBe(
      `regional-population - ${FIRST_TAB}.csv`,
    );
  });

  it("re-downloads the tab when the form asks for another parse", async () => {
    await _pickTheSheet();
    await _clickProcess();
    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledTimes(1);
    });

    await _chooseFormTab(SECOND_TAB);
    // The selection has to land before the re-parse can carry it.
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /^tab$/i })).toHaveValue(
        SECOND_TAB,
      );
    });
    // Choosing a tab only records the choice; the form re-reads on an explicit
    // request, the same as the CSV and XLSX paths.
    await act(async () => {
      screen.getByRole("button", { name: /process data again/i }).click();
    });

    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledTimes(2);
    });

    // A tab is its own download, so the second parse fetches the second tab
    // rather than re-reading bytes held from the first.
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledTimes(2);
    expect(getGoogleSheetTabCsvExportMock.mock.calls[1]![0].sheetId).toBe(
      SECOND_TAB_GID,
    );
    // Positive control on the default: the first download asked for the first
    // tab, so a hard-coded gid cannot satisfy both calls.
    expect(getGoogleSheetTabCsvExportMock.mock.calls[0]![0].sheetId).toBe(
      FIRST_TAB_GID,
    );
    // The superseded local dataset is dropped rather than left behind.
    expect(dropLocalDatasetMock).toHaveBeenCalledTimes(1);
  });

  it("shows no header or rows-to-skip control, which the CSV sniff decides", async () => {
    // A tab arrives as CSV and DuckDB's sniffer detects the header itself, so
    // there is nothing for the user to declare.
    await _pickTheSheet();
    await _clickProcess();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /^tab$/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByLabelText(/number of rows to skip/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /header row/i }),
    ).not.toBeInTheDocument();
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
    const { GoogleDriveError } =
      await import("@/clients/google/GoogleDriveClient/GoogleDriveError");
    getGoogleSheetTabCsvExportMock.mockRejectedValue(
      new GoogleDriveError({
        code: "export-too-large",
        status: 403,
        reason: "exportSizeLimitExceeded",
      }),
    );

    await _pickTheSheet();
    await _clickProcess();

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
    const { GoogleDriveError } =
      await import("@/clients/google/GoogleDriveClient/GoogleDriveError");
    getGoogleSheetTabsMock.mockRejectedValue(
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
